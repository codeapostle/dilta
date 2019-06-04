import { AcademicService } from '../../services/academic.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClientUtilService, PrinterService } from '@dilta/client-shared';
import {
  ClassDetailedStat,
  LevelStaticDetailsGridConfig,
  DateFormat
} from '@dilta/shared';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { format } from 'date-fns';

@Component({
  selector: 'acada-level-static-details-page',
  templateUrl: './level-static-details-page.component.html',
  styleUrls: ['./level-static-details-page.component.scss']
})
export class LevelStaticDetailsPageComponent implements OnInit {
  statics$: Observable<ClassDetailedStat[]>;

  constructor(
    private acada: AcademicService,
    private router: Router,
    private printer: PrinterService,
    public util: ClientUtilService
  ) {}

  viewClass(detail: ClassDetailedStat) {
    this.router.navigate(['academics', 'levels', detail.value]);
  }

  print() {
    this.statics$.pipe(first()).subscribe(stats =>
      this.printer.printTable(LevelStaticDetailsGridConfig, stats, {
        filename: `class_levels_statics ${format(Date.now(), DateFormat)}`
      })
    );
  }

  ngOnInit() {
    this.statics$ = this.acada.levelStatics();
    this.statics$
      .pipe(first())
      .subscribe({ error: err => this.util.error(err) });
  }
}
