import { Component, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss', './home.nav.scss']
})
export class HomeComponent implements OnDestroy {
  subscriptions: Subscription[] = [];

  navLinks = ['Home', 'Projects'];
  elementRoot = document.documentElement;
  mousePos = new Subject<{ x: string; y: string }>();

  constructor() {
    this.setupScssVariables();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
  }

  private setupScssVariables() {
    this.getMousePos();
  }

  private getMousePos() {
    addEventListener('mousemove', mouseEvent => {
      this.mousePos.next({
        x: `${mouseEvent.clientX}px`,
        y: `${mouseEvent.clientY}px`
      });
    });
  }
}
