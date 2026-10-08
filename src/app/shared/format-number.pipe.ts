import { Pipe, PipeTransform } from '@angular/core';
import { FormatMode, formatValue } from './format';

@Pipe({ name: 'fmt', standalone: true })
export class FormatNumberPipe implements PipeTransform {
  transform(value: number | null | undefined, mode: FormatMode = 'dec'): string {
    return formatValue(value ?? 0, mode);
  }
}
