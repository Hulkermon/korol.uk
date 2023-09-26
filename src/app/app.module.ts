import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StyleComponent } from './components/style/style.component';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'style', component: StyleComponent },
];

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    StyleComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes),
    BrowserAnimationsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
