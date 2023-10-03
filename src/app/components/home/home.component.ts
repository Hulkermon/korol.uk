import { Component, HostListener, ViewChild, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  navLinks = [
    'Home',
    'Projects',
  ];
}
