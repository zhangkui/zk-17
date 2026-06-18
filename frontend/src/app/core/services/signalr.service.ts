import { Injectable, OnDestroy } from '@angular/core';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import { Subject } from 'rxjs';

export interface SignalRMessage {
  type: string;
  payload: any;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService implements OnDestroy {
  private hubConnection: HubConnection | null = null;
  private messageSubject = new Subject<SignalRMessage>();
  public message$ = this.messageSubject.asObservable();
  public connected = false;

  constructor() {}

  startConnection(): void {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl('/hubs/monitoring')
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    this.hubConnection.on('ForkliftPositionUpdate', (payload: any) => {
      this.messageSubject.next({ type: 'ForkliftPositionUpdate', payload });
    });

    this.hubConnection.on('PersonnelPositionUpdate', (payload: any) => {
      this.messageSubject.next({ type: 'PersonnelPositionUpdate', payload });
    });

    this.hubConnection.on('BlindSpotUpdate', (payload: any) => {
      this.messageSubject.next({ type: 'BlindSpotUpdate', payload });
    });

    this.hubConnection.on('WarningTriggered', (payload: any) => {
      this.messageSubject.next({ type: 'WarningTriggered', payload });
    });

    this.hubConnection.on('WarningResolved', (payload: any) => {
      this.messageSubject.next({ type: 'WarningResolved', payload });
    });

    this.hubConnection.on('PredictionWarningGenerated', (payload: any) => {
      this.messageSubject.next({ type: 'PredictionWarningGenerated', payload });
    });

    this.hubConnection.on('PredictionWarningUpdated', (payload: any) => {
      this.messageSubject.next({ type: 'PredictionWarningUpdated', payload });
    });

    this.hubConnection.onreconnected(() => {
      this.connected = true;
    });

    this.hubConnection.onreconnecting(() => {
      this.connected = false;
    });

    this.hubConnection.start()
      .then(() => { this.connected = true; })
      .catch(() => { this.connected = false; });
  }

  stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.connected = false;
    }
  }

  ngOnDestroy(): void {
    this.stopConnection();
    this.messageSubject.complete();
  }
}
