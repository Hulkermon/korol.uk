import { Component, HostListener, ViewChild, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements AfterViewInit {

  // doCssTrickery = false;
  hoveringCard = false;

  @ViewChild('cursorBackground') cursorBgElRef?: ElementRef;
  @ViewChild('flippyCard') cardElRef?: ElementRef;

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent) {
    // this.updateShadowPos(event.clientX, event.clientY);
    this.updateCardShadow(event.clientX, event.clientY);
  }

  private updateCardShadow(mousePosX: number, mousePosY: number) {
    if (this.hoveringCard) {
      const cardEl = (this.cardElRef!.nativeElement as Element);
      const cardBounds = cardEl.getBoundingClientRect();
      const cardPosX = (cardBounds.right + cardBounds.left) / 2;
      const cardPosY = (cardBounds.bottom + cardBounds.top) / 2;
      const shadowPosX = (cardPosX - mousePosX) / 5;
      const shadowPosY = (cardPosY - mousePosY) / 5;
      this.cardElRef!.nativeElement.style.boxShadow = `#ffc0cb67 ${shadowPosX}px ${shadowPosY}px 20px 20px`;
      this.cardElRef!.nativeElement.style.transition = 'box-shadow 0ms';
    } else {
      this.cardElRef!.nativeElement.style.boxShadow = 'none';
      this.cardElRef!.nativeElement.style.transition = 'box-shadow 350ms ease';
    }
  }

  // private updateShadowPos(posX: number, posY: number) {
  //   if (this.doCssTrickery) {
  //     this.cursorBgElRef!.nativeElement.style.display = 'inherit';
  //     this.cursorBgElRef!.nativeElement.style.left = `${posX}px`;
  //     this.cursorBgElRef!.nativeElement.style.top = `${posY}px`;
  //   }
  //   else {
  //     this.cursorBgElRef!.nativeElement.style.display = 'none';
  //   }
  // }

  @HostListener('mouseover', ['$event.target']) onHover(targetElement: any) {
    this.hoveringCard = targetElement == this.cardElRef!.nativeElement;
  }

  // @HostListener('mouseout', ['$event.target']) offHover(hoveredElement: any) {
  //   this.hoveringCard = hoveredElement == this.cardElRef!.nativeElement;
  //   this.updateShadowPos(0, 0);
  // }

  ngAfterViewInit(): void {
    if (this.cardElRef === undefined) {
      throw new Error("card element (#flilppyCard) not found.");
    }
  }
}
