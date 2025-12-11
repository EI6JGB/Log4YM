const API_BASE = '/api';

export interface QsoResponse {
  id: string;
  callsign: string;
  qsoDate: string;
  timeOn: string;
  timeOff?: string;
  band: string;
  mode: string;
  frequency?: number;
  rstSent?: string;
  rstRcvd?: string;
  name?: string;
  grid?: string;
  country?: string;
  station?: StationInfo;
  comment?: string;
  createdAt: string;
}

export interface StationInfo {
  name?: string;
  grid?: string;
  country?: string;
  dxcc?: number;
  state?: string;
  continent?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateQsoRequest {
  callsign: string;
  qsoDate: string;
  timeOn: string;
  band: string;
  mode: string;
  frequency?: number;
  rstSent?: string;
  rstRcvd?: string;
  name?: string;
  grid?: string;
  country?: string;
  comment?: string;
}

export interface QsoStatistics {
  totalQsos: number;
  uniqueCallsigns: number;
  uniqueCountries: number;
  uniqueGrids: number;
  qsosToday: number;
  qsosByBand: Record<string, number>;
  qsosByMode: Record<string, number>;
}

export interface Spot {
  id: string;
  dxCall: string;
  spotter: string;
  frequency: number;
  mode?: string;
  comment?: string;
  source?: string;
  time: string;
  country?: string;
  dxStation?: {
    country?: string;
    dxcc?: number;
    grid?: string;
    continent?: string;
  };
}

export interface QsoQuery {
  callsign?: string;
  name?: string;
  band?: string;
  mode?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedQsoResponse {
  items: QsoResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SpotQuery {
  band?: string;
  mode?: string;
  limit?: number;
}

class ApiClient {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  // QSOs
  async getQsos(query?: QsoQuery): Promise<PaginatedQsoResponse> {
    const params = new URLSearchParams();
    if (query?.callsign) params.append('callsign', query.callsign);
    if (query?.name) params.append('name', query.name);
    if (query?.band) params.append('band', query.band);
    if (query?.mode) params.append('mode', query.mode);
    if (query?.fromDate) params.append('fromDate', query.fromDate);
    if (query?.toDate) params.append('toDate', query.toDate);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    const qs = params.toString();
    return this.fetch<PaginatedQsoResponse>(`/qsos${qs ? `?${qs}` : ''}`);
  }

  async getQso(id: string): Promise<QsoResponse> {
    return this.fetch<QsoResponse>(`/qsos/${id}`);
  }

  async createQso(qso: CreateQsoRequest): Promise<QsoResponse> {
    return this.fetch<QsoResponse>('/qsos', {
      method: 'POST',
      body: JSON.stringify(qso),
    });
  }

  async deleteQso(id: string): Promise<void> {
    await fetch(`${API_BASE}/qsos/${id}`, { method: 'DELETE' });
  }

  async getStatistics(): Promise<QsoStatistics> {
    return this.fetch<QsoStatistics>('/qsos/statistics');
  }

  // Spots
  async getSpots(query?: SpotQuery): Promise<Spot[]> {
    const params = new URLSearchParams();
    if (query?.band) params.append('band', query.band);
    if (query?.mode) params.append('mode', query.mode);
    if (query?.limit) params.append('limit', query.limit.toString());
    const qs = params.toString();
    return this.fetch<Spot[]>(`/spots${qs ? `?${qs}` : ''}`);
  }

  // Health
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.fetch('/health');
  }

  // Plugins
  async getPlugins(): Promise<Array<{ id: string; name: string; version: string; enabled: boolean }>> {
    return this.fetch('/plugins');
  }
}

export const api = new ApiClient();
