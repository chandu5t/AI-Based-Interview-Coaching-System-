import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UploadComponent } from './components/upload/upload.component';
import { InterviewComponent } from './components/interview/interview.component';
import { ResultsComponent } from './components/results/results.component';

@NgModule({
    declarations: [AppComponent, UploadComponent, InterviewComponent, ResultsComponent],
    imports: [BrowserModule, HttpClientModule, FormsModule, AppRoutingModule],
    bootstrap: [AppComponent]
})
export class AppModule { }