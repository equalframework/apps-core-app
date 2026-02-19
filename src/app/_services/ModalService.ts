import { Injectable, Type } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

@Injectable({ providedIn: 'root' })
export class ModalService {

    constructor(private dialog: MatDialog) {}

  /**
   * Opens a modal dialog with the specified component.
   *
   * @param component - The Angular component class to display in the modal.
   * @param data - Optional data to pass to the component. Can include `_onSuccess` and `_onError` callbacks.
   */
    public open<T>(component: Type<T>, data?: any): void {
        const dialogRef = this.dialog.open(component, {
            data,
            width: '800px',
            disableClose: true,
            autoFocus: false,
            restoreFocus: false,
            hasBackdrop: true
        });

        // Optional: handle close logic here if you want to centralize result/callback handling
        dialogRef.afterClosed().subscribe((result) => {
            if(result?.success) {
                data?._onSuccess?.(result.data);
            }
            else {
                data?._onError?.(result?.error || 'Dialog closed');
            }
        });
    }
}
