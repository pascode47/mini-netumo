import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Target } from '../models/target.model';
import { Alert } from '../models/alert.model'; // Assuming you have an Alert model in frontend

// Define a generic API response structure if your backend uses one consistently
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
  totalPages?: number;
  currentPage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = '/api/v1'; // Using a relative URL, proxy will handle it

  constructor(private http: HttpClient) { }

  // Target Endpoints
  getTargets(page: number = 1, limit: number = 10): Observable<ApiResponse<Target[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponse<Target[]>>(`${this.baseUrl}/targets`, { params });
  }

  getTargetById(id: string): Observable<ApiResponse<Target>> {
    return this.http.get<ApiResponse<Target>>(`${this.baseUrl}/targets/${id}`);
  }

  createTarget(targetData: Partial<Target>): Observable<ApiResponse<Target>> {
    // Ensure only relevant fields for creation are sent
    const payload: Partial<Target> = {
      url: targetData.url,
      name: targetData.name,
      checkIntervalMinutes: targetData.checkIntervalMinutes,
      isActive: targetData.isActive,
      notificationEmail: targetData.notificationEmail,
      notificationWebhookUrl: targetData.notificationWebhookUrl
    };
    return this.http.post<ApiResponse<Target>>(`${this.baseUrl}/targets`, payload);
  }

  updateTarget(id: string, targetData: Partial<Target>): Observable<ApiResponse<Target>> {
     // Ensure only relevant fields for update are sent
     const payload: Partial<Target> = {
      name: targetData.name,
      checkIntervalMinutes: targetData.checkIntervalMinutes,
      isActive: targetData.isActive,
      notificationEmail: targetData.notificationEmail,
      notificationWebhookUrl: targetData.notificationWebhookUrl
      // URL is typically not updatable, or handled differently
    };
    return this.http.put<ApiResponse<Target>>(`${this.baseUrl}/targets/${id}`, payload);
  }

  deleteTarget(id: string): Observable<ApiResponse<null>> { // Assuming delete returns success/message
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/targets/${id}`);
  }

  getTargetUptimeSummary(targetId: string, periodHours: number = 24): Observable<ApiResponse<any>> { // Define a specific model for UptimeSummary later
    let params = new HttpParams().set('periodHours', periodHours.toString());
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/targets/${targetId}/uptime-summary`, { params });
  }

  // Alert Endpoints
  getAlertsForTarget(targetId: string, page: number = 1, limit: number = 10): Observable<ApiResponse<Alert[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    // Backend route is /targets/:targetId/alerts
    return this.http.get<ApiResponse<Alert[]>>(`${this.baseUrl}/targets/${targetId}/alerts`, { params });
  }

  getAllAlerts(page: number = 1, limit: number = 10, filters?: any): Observable<ApiResponse<Alert[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<ApiResponse<Alert[]>>(`${this.baseUrl}/alerts`, { params });
  }

  acknowledgeAlert(alertId: string): Observable<ApiResponse<Alert>> {
    return this.http.put<ApiResponse<Alert>>(`${this.baseUrl}/alerts/${alertId}/acknowledge`, {});
  }
}
