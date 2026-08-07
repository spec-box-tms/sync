import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from './api-url.token';
import { ProjectService } from './project.service';

class EventSourceStub {
  addEventListener() {}
}

describe('ProjectService read-only options', () => {
  beforeAll(() => {
    vi.stubGlobal('EventSource', EventSourceStub);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
      ],
    });
  });

  const startRequests = async () => {
    const service = TestBed.inject(ProjectService);
    const http = TestBed.inject(HttpTestingController);

    expect(service.readOnly()).toBe(true);
    TestBed.tick();
    http.expectOne('/api/project').flush({ features: [], trees: [] });

    return { service, options: http.expectOne('/api/options') };
  };

  it('forwards the successful options response without runtime validation', async () => {
    const { service, options } = await startRequests();

    options.flush({ readOnly: null } as unknown as { readOnly: boolean });
    await Promise.resolve();

    expect(service.readOnly()).toBeNull();
  });

  it('enables editing only after the options resource resolves to literal false', async () => {
    const { service, options } = await startRequests();

    options.flush({ readOnly: false });
    await Promise.resolve();

    expect(service.readOnly()).toBe(false);
  });

  it('stays read-only when the options request fails', async () => {
    const { service, options } = await startRequests();

    options.flush(null, { status: 500, statusText: 'Server Error' });
    await Promise.resolve();

    expect(service.readOnly()).toBe(true);
  });
});
