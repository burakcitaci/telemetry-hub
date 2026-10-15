import type { ClickhouseService } from '../../telemetry/services/clickhouse.service';
import type { SignalAdapter, SignalQuery } from '../signal-adapter';
import { attributeValue } from './query-filters';
import { inspectSignalQuery, prepareQuery, queryScalar, type AdapterOptions } from './adapter-query';

export class TraceAdapter implements SignalAdapter {
  constructor(private readonly clickhouse: ClickhouseService, private readonly options: AdapterOptions = {}) {}

  validate(monitor: SignalQuery): void { inspectSignalQuery(monitor, 'TRACE', this.options.warn); }

  async aggregate(monitor: SignalQuery, since: Date, until: Date): Promise<number> {
    return (await this.measure(monitor, since, until)).value;
  }

  async measure(monitor: SignalQuery, since: Date, until: Date) {
    if (monitor.signal_type !== 'TRACE') throw new Error('TraceAdapter requires TRACE.');
    const query = prepareQuery(this.clickhouse, monitor, since, until, this.options, 'Timestamp');
    const field = monitor.aggregation === 'COUNT' ? '1' : monitor.field === 'duration_ms' ? 'Duration / 1000000.0' :
      `toFloat64OrNull(${attributeValue(monitor.field!, 'TRACE', query.params, 'measure')})`;
    const unit = monitor.aggregation === 'COUNT' ? 'spans' : monitor.field === 'duration_ms' ? 'ms' : monitor.field!;
    return queryScalar(this.clickhouse, monitor, `SELECT ${field} AS value FROM otel_traces ${query.where}`,
      query.params, this.options, unit, query.warnings);
  }
}
