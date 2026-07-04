import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

interface ASRResponse {
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceAsrService {
  private apiUrl = 'http://localhost:8000/asr/transcribe';

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private _isRecording = false;

  isRecording$ = new Subject<boolean>();

  constructor(private http: HttpClient) {}

  get isRecording(): boolean {
    return this._isRecording;
  }

  async startRecording(): Promise<void> {
    if (this._isRecording) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];

    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    this._isRecording = true;
    this.isRecording$.next(true);
  }

  async stopAndGetAudio(): Promise<{ text: string; blob: Blob }> {
    if (!this.mediaRecorder || !this._isRecording) {
      return { text: '', blob: new Blob() };
    }

    const recorder = this.mediaRecorder;

    return new Promise<{ text: string; blob: Blob }>((resolve, reject) => {
      recorder.onstop = async () => {
        try {
          const blob = new Blob(this.chunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');

          const res = await this.http.post<ASRResponse>(this.apiUrl, formData).toPromise();
          const text = res?.text || '';
          this._isRecording = false;
          this.isRecording$.next(false);
          resolve({ text, blob });
        } catch (err) {
          this._isRecording = false;
          this.isRecording$.next(false);
          reject(err);
        }
      };

      recorder.stop();
      recorder.stream.getTracks().forEach(t => t.stop());
    });
  }
}

