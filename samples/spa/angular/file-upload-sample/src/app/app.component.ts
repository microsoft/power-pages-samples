import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService, UploadedFile } from './file.service';

// One screen: pick a file, upload it, see your files, download or delete them.
// All the Web API work lives in file.service.ts.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="card">
      <h1>My documents</h1>
      <p class="subtitle">
        Files are stored as Dataverse notes on your contact record, uploaded and
        downloaded through the Power Pages Web API.
      </p>

      <label class="upload" [class.disabled]="busy">
        {{ busy ? 'Working…' : '＋ Upload a file' }}
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          (change)="handleFile($event)"
          [disabled]="busy"
          hidden
        />
      </label>
      <p class="hint">PDF, PNG, JPEG, or TXT · up to 3.5 MB</p>

      <p class="error" *ngIf="error">⚠️ {{ error }}</p>

      <p class="empty" *ngIf="files.length === 0">No files yet.</p>
      <ul class="files" *ngIf="files.length > 0">
        <li *ngFor="let f of files">
          <div>
            <span class="name">{{ f.filename }}</span>
            <span class="meta">{{ fileService.formatSize(f.filesize) }}</span>
          </div>
          <div class="actions">
            <button (click)="fileService.downloadFile(f.annotationid)" [disabled]="busy">
              Download
            </button>
            <button
              class="danger"
              (click)="handleDelete(f.annotationid)"
              [disabled]="busy"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </main>
  `,
})
export class AppComponent implements OnInit {
  // The injectable that holds the whole lesson.
  readonly fileService = inject(FileService);

  files: UploadedFile[] = [];
  busy = false;
  error = '';

  ngOnInit(): void {
    this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      this.files = await this.fileService.listFiles();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Could not load files.';
    }
  }

  async handleFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error = '';

    // Guard before touching the network.
    const validationError = this.fileService.validateFile(file);
    if (validationError) {
      this.error = validationError;
      input.value = '';
      return;
    }

    this.busy = true;
    try {
      await this.fileService.uploadFile(file);
      await this.refresh();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Upload failed.';
    } finally {
      this.busy = false;
      input.value = '';
    }
  }

  async handleDelete(id: string): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await this.fileService.deleteFile(id);
      await this.refresh();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Delete failed.';
    } finally {
      this.busy = false;
    }
  }
}
