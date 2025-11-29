import { ResendEmailService } from './resend-email-service';

export interface JobAlertData {
  userEmail: string;
  userName?: string;
  searchCriteria: {
    location: string;
    jobGroups: string[];
    // Add other relevant criteria for display
  };
  newJobs: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    url: string; // Link to the job details
  }>;
}

export class JobNotificationService {
  static async sendJobAlert(data: JobAlertData) {
    const emailService = ResendEmailService.getInstance();

    const jobListHtml = data.newJobs.map(job => `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="margin: 0 0 5px 0; color: #111827; font-size: 18px;">${job.title}</h3>
        <p style="margin: 0 0 5px 0; color: #4b5563;">${job.company} • ${job.location}</p>
        <a href="${job.url}" style="display: inline-block; background-color: #14ad9f; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">Job ansehen</a>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Neue Jobs für Sie</title>
        </head>
        <body style="font-family: sans-serif; line-height: 1.5; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14ad9f;">Taskilo Jobfinder</h1>
          </div>
          
          <p>Hallo${data.userName ? ' ' + data.userName : ''},</p>
          
          <p>wir haben neue Jobs gefunden, die zu Ihren Suchkriterien passen:</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <strong>Ihre Suche:</strong><br>
            Ort: ${data.searchCriteria.location}<br>
            ${data.searchCriteria.jobGroups.length > 0 ? `Berufsgruppen: ${data.searchCriteria.jobGroups.length} ausgewählt` : ''}
          </div>

          <div style="margin-top: 30px;">
            ${jobListHtml}
          </div>

          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>Sie erhalten diese E-Mail, weil Sie den Jobfinder auf Taskilo aktiviert haben.</p>
            <p><a href="https://taskilo.de/dashboard" style="color: #14ad9f;">Einstellungen ändern</a></p>
          </div>
        </body>
      </html>
    `;

    return emailService.sendEmail({
      from: 'Taskilo Jobfinder <noreply@taskilo.de>',
      to: [data.userEmail],
      subject: `Neue Jobs in ${data.searchCriteria.location} gefunden!`,
      htmlContent: htmlContent,
      textContent: `Hallo, wir haben ${data.newJobs.length} neue Jobs für Sie gefunden. Bitte prüfen Sie Ihre E-Mails für Details.`,
    });
  }
}
