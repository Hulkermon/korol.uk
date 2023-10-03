// prettier-ignore
import { AfterViewInit, Component, ElementRef, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss', './home.nav.scss']
})
export class HomeComponent implements OnDestroy, AfterViewInit {
  subscriptions: Subscription[] = [];

  navLinks = ['Home', 'Projects'];
  @ViewChildren('navLink') navLinkElements?: QueryList<ElementRef>;
  elementRoot = document.documentElement;
  mousePos = new Subject<{ x: number; y: number }>();

  constructor() {}

  ngAfterViewInit(): void {
    this.getMousePos();
    this.bindMousePosToScss();
    this.bindNavItemPositionsToScss();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
  }

  private getMousePos() {
    addEventListener('mousemove', mouseEvent => {
      this.mousePos.next({
        x: mouseEvent.clientX,
        y: mouseEvent.clientY
      });
    });
  }

  private setScssVariable(key: string, value: any): void {
    this.elementRoot.style.setProperty(`--${key}`, value);
  }

  private bindMousePosToScss() {
    const sub = this.mousePos.subscribe(pos => {
      this.setScssVariable('mouse-x', pos.x);
      this.setScssVariable('mouse-y', pos.y);
    });
    this.subscriptions.push(sub);
  }

  private bindNavItemPositionsToScss() {
    let tempMouseSub: Subscription;
    this.navLinkElements?.forEach((navLink, i) => {
      //prettier-ignore
      navLink.nativeElement.addEventListener('mouseover', (mouseEvent: MouseEvent) => {
        const rect: DOMRect = navLink.nativeElement.getBoundingClientRect();
        const xCenter = (rect.left + rect.right) / 2;
        const yCenter = (rect.top + rect.bottom) / 2;

        tempMouseSub = this.mousePos.subscribe(pos => {
          const xOffsetFromElement = pos.x - xCenter;
          const yOffsetFromElement = pos.y - yCenter;
          this.setScssVariable(`mouse-x-from-nav`, xOffsetFromElement);
          this.setScssVariable(`mouse-y-from-nav`, yOffsetFromElement);
        })
      });
      //prettier-ignore
      navLink.nativeElement.addEventListener('mouseleave', (mouseEvent: MouseEvent) => {
        tempMouseSub.unsubscribe();
      });
    });
  }
}
