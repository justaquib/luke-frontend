import { Routes } from '@angular/router';
import { ChatUI } from './chat-ui/chat-ui';
import { Trainer } from './trainer/trainer';
import { Landing } from './landing/landing';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'chat', component: ChatUI },
  { path: 'trainer', component: Trainer },
  { path: '**', redirectTo: '' },
];