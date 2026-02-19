// test.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-test',
    templateUrl: './test.component.html',
    styleUrls: ['./test.component.scss'],
})
export class TestComponent implements OnInit {

        constructor(
                private dialogRef: MatDialogRef<TestComponent, any>,
                @Inject(MAT_DIALOG_DATA) public data: any) {}


        ngOnInit() {
                console.log('TestComponent initialisé avec :', this.data);
        }

        public onclickValidate() {
                console.log('Validation en cours...');

                // success
                this.dialogRef.close({ success: true, data: { selection: [3], objects: [{id: 3, foo: 'ok', name: 'fake sig'}] } });
        }

        public onclickCancel() {
                // error
                this.dialogRef.close({ success: false, error: { 'invalid_value': 'given value is invalid' } });
        }
}
