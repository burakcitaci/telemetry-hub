import type { ClickhouseService } from '../../telemetry/services/clickhouse.service';
import type { SignalAdapter, SignalQuery } from '../signal-adapter';
import { attributeValue } from './query-filters';
import { prepareQuery, queryScalar, type AdapterOptions } from './adapter-query';

export class LogAdapter implements SignalAdapter {
  constructor(private readonly clickhouse: ClickhouseService, private readonly options: AdapterOptions = {}) {}

  async aggregate(monitor: SignalQuery, since: Date, until: Date): Promise<number> {
    return (await this.measure(monitor, since, until)).value;
  }

  async measure(monitor: SignalQuery, since: Date, until: Date) {
    if (monitor.signal_type !== 'LOG') throw new Error('LogAdapter requires LOG.');
    const query = prepareQuery(this.clickhouse, monitor, since, until, this.options, 'Timestamp');
    const field = monitor.aggregation === 'COUNT' ? '1' :
      `toFloat64OrNull(${attributeValue(monitor.field!, 'LOG', query.params, 'measure')})`;
    return queryScalar(this.clickhouse, monitor, `SELECT ${field} AS value FROM otel_logs ${query.where}`,
      query.params, this.options, monitor.aggregation === 'COUNT' ? 'logs' : monitor.field!, query.warnings);
  }
}
