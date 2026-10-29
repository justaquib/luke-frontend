import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AppIcon, type IconName } from '../shared/app-icon';

interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

interface Step {
  num: string;
  title: string;
  body: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, AppIcon],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css', './landing-preview.css', './landing-sections.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  protected readonly auth = inject(AuthService);
  protected readonly features: Feature[] = [
    {
      icon: 'play',
      title: 'Trainable in seconds',
      body: 'Drop a PDF, paste docs, or answer the inbox. The assistant learns from what you give it — no model fine-tuning, no GPU.',
    },
    {
      icon: 'merge',
      title: 'Intent-aware routing',
      body: 'Paraphrases automatically map to the closest trained intent. One canonical answer, many ways to ask.',
    },
    {
      icon: 'external',
      title: 'Open sources',
      body: 'Weather, Wikipedia and any HTTP source you can describe plug in as fallbacks. Toggle them per-user in Settings.',
    },
    {
      icon: 'file',
      title: 'Yours to keep',
      body: 'Self-hosted Postgres + ChromaDB on your machine. Your data never leaves the box. MIT-licensed.',
    },
  ];

  protected readonly steps: Step[] = [
    {
      num: '01',
      title: 'Bring your knowledge',
      body: 'Ingest documents or add Q&A pairs manually. The trainer surfaces the questions the assistant could not answer.',
    },
    {
      num: '02',
      title: 'Approve & refine',
      body: 'Review pending questions, approve the good answers, mark duplicates. Merge intents that mean the same thing.',
    },
    {
      num: '03',
      title: 'Ship the chat',
      body: 'Embed the chat widget in your app or point your users to /chat. Answers improve every day the inbox is reviewed.',
    },
  ];

  protected readonly techStack: string[] = [
    'FastAPI',
    'PostgreSQL',
    'ChromaDB',
    'spaCy',
    'Angular',
    'Tailwind CSS',
    'Open-Meteo',
    'Wikipedia',
  ];

  protected readonly year = new Date().getFullYear();
}
