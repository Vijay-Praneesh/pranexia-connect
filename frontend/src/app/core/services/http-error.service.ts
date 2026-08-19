import { Injectable } from '@angular/core';

import { AppHttpError } from '../models/http-error.model';
import { mapHttpError } from '../utils/http-error.util';

@Injectable({ providedIn: 'root' })
export class HttpErrorService {
  map(error: unknown): AppHttpError {
    return mapHttpError(error);
  }
}
