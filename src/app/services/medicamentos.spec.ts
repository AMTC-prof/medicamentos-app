import { TestBed } from '@angular/core/testing';

import { Medicamentos } from './medicamentos';

describe('Medicamentos', () => {
  let service: Medicamentos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Medicamentos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
