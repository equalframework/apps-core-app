// component-registry.service.ts
import { Injectable, Type } from '@angular/core';


@Injectable({ providedIn: 'root' })
export class ComponentsRegistryService {
    private registry = new Map<string, Type<any>>();

    register(name: string, component: Type<any>) {
        this.registry.set(name, component);
    }

    get(name: string): Type<any> | undefined {
        return this.registry.get(name);
    }

    has(name: string): boolean {
        return this.registry.has(name);
    }

    clear() {
        this.registry.clear();
    }
}
