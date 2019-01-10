import { Injectable } from '@angular/core';
import {
  School,
  StudentReportSheet,
  schoolTermValueToKey,
  schoolClassValueToKey,
  PrintData,
  AcademicReportCardGridConfig,
  EntityNames,
  ModelOperations,
  Manager,
  KeysConfig,
  DateFormat,
  PrintDataConfig
} from '@dilta/shared';
import * as Jspdf from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { Store } from '@ngrx/store';
import { schoolFeature } from '../ngrx/school';
import { map, first, exhaustMap, withLatestFrom } from 'rxjs/operators';
import { TransportService } from '@dilta/electron-client';


@Injectable()
export class PrinterService {
  constructor(private store: Store<any>, private transport: TransportService) {}

  school$() {
    return this.store.select(schoolFeature).pipe(
      first(),
      map(school => school.details)
    );
  }

  schoolHeader$() {
    return this.school$().pipe(
      exhaustMap(school =>
        this.transport.modelAction<Manager>(
          EntityNames.Manager,
          ModelOperations.Retrieve,
          { school: school.id }
        )
      ),
      withLatestFrom(this.school$()),
      map(([manager, school]) => this.generateDocumentHeader(school, manager))
    );
  }

  generateDocumentHeader(school: School, manager: Manager) {
    const doc = new Jspdf();

    doc.addImage(school.logo, 'JPEG', 90, 10, 32, 32);
    doc.setFontSize(20).text(school.name, 100, 60, {
      align: 'center',
      maxWidth: 100
    });
    doc
      .setFontSize(10)
      .text([`${school.address}, ${school.town}, ${school.state}`], 100, 67, {
        align: 'center',
        maxWidth: 100
      });

    return doc;
  }

  printTable<T>(keys: KeysConfig[], data: T[],  config: PrintDataConfig) {
    this.schoolHeader$().subscribe(doc => {
      const { columns, rows } = this.tableFormat(keys, data);
      if (config.map) {
        doc = config.map(doc);
      }
      doc.autoTable(columns, rows, { startY: config.startY || 86, margin: config.margin || 10 });
      doc.autoPrint();
      doc.save(`${config.filename}.pdf`);
    });
  }

  reportCard(sheet: StudentReportSheet) {
    this.schoolHeader$()
      .pipe(first())
      .subscribe(doc => {
        doc.setFontSize(15).text('SCORE CARD', 10, 85);
        doc
          .setFontSize(12)
          .text(
            `${schoolTermValueToKey(sheet.term)} Term  of ${
              sheet.session
            } Academic Year`,
            10,
            92
          );
        doc.setFontSize(10).text(`Pupil's information`, 10, 97);
        doc.line(10, 98, 200, 98);
        doc.setFontSize(12);
        doc
          .text(`Name: ${sheet.biodata.name}`, 10, 105)
          .text(`Admission No: ${sheet.biodata.admissionNo}`, 130, 105);
        doc.line(10, 108, 200, 108);
        doc
          .text(`Sex: ${sheet.biodata.gender}`, 10, 115)
          .text(`Number In Class: ${sheet.totalStudents}`, 130, 115);
        doc
          .text(
            `Date of Birth: ${format(sheet.biodata.dob, DateFormat)}`,
            10,
            122
          )
          .text(`Class:  ${schoolClassValueToKey(sheet.level)}`, 130, 122);
        doc.line(10, 125, 200, 125);
        // append table-with spacing
        // doc
        //   .line(148, 251, 180, 251)
        //   .text([`Mrs Akinde S.T`, `Adminstrator`], 150, 250);
        const { columns, rows } = this.tableFormat(AcademicReportCardGridConfig, sheet.scoreSheet);
        doc.autoTable(columns, rows, {
          startY: 128,
          margin: 10,
          showHeader: 'firstPage'
        });
        doc.autoPrint();
        doc.save(
          `${sheet.biodata.name}_${schoolTermValueToKey(sheet.term)}_Term.pdf`
        );
      });
  }

  tableFormat<T>(config: KeysConfig[], data: T[]): PrintData<T & { no: number }> {
    return {
      columns: config.map(e =>
        Object.assign({}, { title: e.title, dataKey: e.key })
      ),
      rows: data.map((v, index) =>
        Object.assign(v, { no: index + 1 })
      )
    };
  }

}
