import { Component, HostListener, ViewChild, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements AfterViewInit {

  doCssTrickery = false;

  @ViewChild('cursorBackground') cursorBgElRef?: ElementRef;
  @ViewChild('flippyCard') flippyCardElRef?: ElementRef;

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent) {
    this.updateShadowPos(event.clientX, event.clientY);
  }

  private updateShadowPos(posX: number, posY: number) {
    if (this.doCssTrickery) {
      this.cursorBgElRef!.nativeElement.style.display = 'inherit';
      this.cursorBgElRef!.nativeElement.style.left = `${posX}px`;
      this.cursorBgElRef!.nativeElement.style.top = `${posY}px`;
    }
    else {
      this.cursorBgElRef!.nativeElement.style.display = 'none';
    }
  }

  @HostListener('mouseover', ['$event.target']) onHover(hoveringElement: any) {
    const isHoveringFlippyCard = hoveringElement == this.flippyCardElRef!.nativeElement;
    this.doCssTrickery = isHoveringFlippyCard;
  }

  @HostListener('mouseout', ['$event.target']) offHover(hoveredElement: any) {
    const noLongerHoveringFlippyCard = hoveredElement == this.flippyCardElRef!.nativeElement;
    this.doCssTrickery = !noLongerHoveringFlippyCard;
    this.updateShadowPos(0, 0);
  }

  ngAfterViewInit(): void {
    if (this.flippyCardElRef === undefined) {
      throw new Error("cursorBackground element not found.");
    }
  }
}
