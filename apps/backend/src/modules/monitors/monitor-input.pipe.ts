import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MonitorDto } from '../auth/dto/monitor.dto';
import { CreateMonitorDto } from './dto/unified-monitor.dto';

export async function validateMonitorInput<T extends object>(Type: new () => T, value: unknown): Promise<T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Monitor body must be an object.');
  const dto = plainToInstance(Type, value);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) throw new BadRequestException(errors.flatMap(error => Object.values(error.constraints ?? {})));
  return dto;
}

@Injectable()
export class MonitorInputPipe implements PipeTransform {
  transform(value: unknown): Promise<CreateMonitorDto | MonitorDto> {
    return value && typeof value === 'object' && Object.hasOwn(value, 'signal_type')
      ? validateMonitorInput(CreateMonitorDto, value) : validateMonitorInput(MonitorDto, value);
  }
}
