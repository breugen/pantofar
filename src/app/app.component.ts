import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Poteca';
  subtitle = 'Trasee marcate pentru incepatori'
  isScrolled = false;

  @HostListener('document:scroll', ['$event'])
  windowScroll(event: Event) {
    const target = event.target as Document;
    const newScroll = !!target.scrollingElement.scrollTop;
    if (this.isScrolled !== newScroll) {
      this.isScrolled = newScroll;
    }
  }
}
