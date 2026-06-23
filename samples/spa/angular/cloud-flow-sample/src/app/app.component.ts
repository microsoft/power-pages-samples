import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CloudFlowService, CallbackResponse } from './cloud-flow.service';

// One screen, one button. The UI exists only to demonstrate the flow call in
// cloud-flow.service.ts and to render its three states: loading, error, result.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="card">
      <h1>Request a callback</h1>
      <p class="subtitle">
        Submitting this form calls a Power Automate cloud flow and shows what it
        returns.
      </p>

      <form (ngSubmit)="handleSubmit()">
        <label>
          Your name
          <input
            name="name"
            [(ngModel)]="name"
            required
            placeholder="Jordan Avery"
          />
        </label>

        <label>
          Topic
          <select name="topic" [(ngModel)]="topic">
            <option>Account help</option>
            <option>Billing question</option>
            <option>Technical support</option>
          </select>
        </label>

        <button type="submit" [disabled]="status === 'loading'">
          {{ status === 'loading' ? 'Calling flow…' : 'Request callback' }}
        </button>
      </form>

      @if (status === 'error') {
        <p class="error">⚠️ {{ error }}</p>
      }

      @if (result) {
        <div class="result">
          <h2>Flow response</h2>
          <dl>
            <dt>Ticket</dt>
            <dd>{{ result.ticketNumber }}</dd>
            <dt>Message</dt>
            <dd>{{ result.message }}</dd>
            <dt>Estimated callback</dt>
            <dd>{{ result.estimatedCallback }}</dd>
          </dl>
        </div>
      }
    </main>
  `,
})
export class AppComponent {
  private cloudFlow = inject(CloudFlowService);

  name = '';
  topic = 'Account help';
  status: 'idle' | 'loading' | 'error' = 'idle';
  result: CallbackResponse | null = null;
  error = '';

  async handleSubmit(): Promise<void> {
    this.status = 'loading';
    this.error = '';
    this.result = null;
    try {
      this.result = await this.cloudFlow.requestCallback({
        name: this.name,
        topic: this.topic,
      });
      this.status = 'idle';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Something went wrong.';
      this.status = 'error';
    }
  }
}
