import { Component, OnInit } from '@angular/core';
import { ContextService, ApiService, AuthService, EnvService } from 'sb-shared-lib';
import { AppStateService } from 'src/app/_services/AppStateService';

import * as $ from 'jquery';
import { type } from 'jquery';


/*
    This is the component that is bootstrapped by app.module.ts
*/

declare global {
    interface Window { context: any; }
}

@Component({
    selector: 'app-root',
    templateUrl: './app.root.component.html',
    styleUrls: ['./app.root.component.scss']
})
export class AppRootComponent implements OnInit {

    public show_side_menu: boolean = false;
    public show_side_bar: boolean = true;

    public show_search_side_menu: boolean = false;

    public filter: string;

    // id of the targeted app
    public app: string;

    // id of the package the app belongs to
    public package: string;

    // display name of the App
    public name: string;

    // original default context, if provided
    private originalContext: any = {};

    // original (full & translated) menu for left pane
    private leftMenu: any = {};

    public topMenuItems = [{name: 'Dashboard'}, {name: 'Users'}, {name: 'Settings'}];
    public navMenuItems: any = [];

    public translationsMenuLeft: any = {};
    public translationsMenuTop: any = {};

    constructor(
        private context:ContextService,
        private api:ApiService,
        private auth:AuthService,
        private env:EnvService,
        private params: AppStateService
    ) {}

    public async ngOnInit() {
        // create a cookie with system signature
        this.captureSystemInfo();

        try {
            await this.auth.authenticate();
        }
        catch(err) {
            let redirect_to = window.location.pathname;
            if(window.location.hash && window.location.hash !== '') {
                redirect_to += window.location.hash;
            }
            window.location.href = '/auth?redirect_to='+encodeURIComponent(redirect_to);
            return;
        }

        this.params.pathParam.subscribe( async (param:any) => {
            this.package = param.package;
            this.app = param.app;
            // (re)load app specifics params & menus
            await this.loadParams();
            // if a context was provided, use it as default
            if(Object.keys(this.originalContext).length) {
                this.onSelectItem({'context': this.originalContext});
            }
        });

    }

    private loadParams() {
        return this.env.getEnv().then( async (environment:any) => {
            // retrieve current app params
            try {
                const data:any = await this.api.fetch('/?get=appinfo&package='+this.package+'&app='+this.app);
                if(data.hasOwnProperty('name')) {
                    this.name = data.name;
                }
                if(data.hasOwnProperty('params')) {

                    // handle default context
                    if(data.params.hasOwnProperty('context')) {
                        this.originalContext = data.params.context;
                    }
                    // handle menus
                    if(data.params.hasOwnProperty('menus')) {
                        if(data.params.menus.hasOwnProperty('top')) {
                            const topMenu:any = await this.api.getMenu(this.package, data.params.menus.top);
                            this.topMenuItems = topMenu.items;
                            this.translationsMenuTop = topMenu.translation;
                        }
                        if(data.params.menus.hasOwnProperty('left')) {
                            const leftMenu = await this.api.getMenu(this.package, data.params.menus.left);
                            if(leftMenu.hasOwnProperty('show_search') && leftMenu.show_search) {
                                this.show_search_side_menu = true;
                            }
                            // store full translated menu
                            this.leftMenu = this.translateMenu(leftMenu.items, leftMenu.translation);
                            // fill left pane with unfiltered menu
                            this.navMenuItems = this.leftMenu;
                        }
                    }
                }
            }
            catch(response) {
                console.warn('unexpected error', response);
            }
        });
    }

    private translateMenu(menu:any, translation: any) {
        let result: any[] = [];
        if(!Array.isArray(menu)) {
            return [];
        }
        for(let item of menu) {
            if(item.id && translation.hasOwnProperty(item.id)) {
                item.label = translation[item.id].label;
            }
            if(item.children && item.children.length) {
                this.translateMenu(item.children, translation);
            }
            result.push(item);
        }
        return result;
    }

    private getFilteredMenu(menu:any[], filter: string = '') {
        let result: any[] = [];

        for(let item of menu) {
            // check for a match, case and diacritic insensitive
            if(item.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(new RegExp(filter, 'i'))) {
                result.push(item);
            }
            else if(item.children && item.children.length) {
                let sub_result: any[] = this.getFilteredMenu(item.children, filter);
                for(let item of sub_result) {
                    result.push(item);
                }
            }
        }
        return result;
    }

    private captureSystemInfo() {
        // #memo - we use navigator.platform and navigator.vendor despite being marked as deprecated since there is no replacement
        let info = {
            resolution: window.screen.width + 'x' + window.screen.height,
            platform: navigator.hasOwnProperty('platform')?navigator.platform:'',
            vendor: navigator.hasOwnProperty('vendor')?navigator.vendor:''
            /*
            agent: navigator.userAgent,
            language: navigator.language
            */
        };

        document.cookie = `system_info=${JSON.stringify(info)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }

    public onchangeFilter() {
        this.navMenuItems = this.getFilteredMenu(
                this.leftMenu,
                // remove trailing space + remove diacritic marks
                this.filter.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            );
    }

    public onToggleItem(item:any) {
        console.log('SettingsAppRoot::onToggleItem', item);

        // check item for route and context details
        this.onSelectItem(item);

        // if item is expanded, fold siblings, if any
        if(item.expanded) {
            for(let sibling of this.navMenuItems) {
                if(item != sibling) {
                    sibling.expanded = false;
                    sibling.hidden = true;
                }
            }
        }
        else {
            for(let sibling of this.navMenuItems) {
                sibling.hidden = false;
                if(sibling.children) {
                    for(let subitem of sibling.children) {
                        subitem.expanded = false;
                        subitem.hidden = false;
                    }
                }
            }
        }
    }

    /**
     * Items are handled as descriptors.
     * They always have a `route` property (if not, it is added and set to '/').
     * And might have an additional `context` property.
     * @param item
     */
    public onSelectItem(item:any) {
        console.log('SettingsAppRoot::onSelectItem', item);
        let descriptor:any = {
        };

        if(!item.hasOwnProperty('context')) {
            return;
        }

        if(item.hasOwnProperty('context')) {
            descriptor.context = {
                ...{
                    type:    'list',
                    name:    'default',
                    mode:    'view',
                    purpose: 'view',
                    // target:  '#sb-container',
                    reset:    true
                },
                ...item.context
            };

            if( item.context.hasOwnProperty('view') ) {
                let parts = item.context.view.split('.');
                if(parts.length) {
                    descriptor.context.type = <string>parts.shift();
                }
                if(parts.length) {
                    descriptor.context.name = <string>parts.shift();
                }
            }

            if( item.context.hasOwnProperty('purpose') && item.context.purpose == 'create') {
                // descriptor.context.type = 'form';
                descriptor.context.mode = 'edit';
            }

        }

        this.context.change(descriptor);
    }

    public toggleSideMenu() {
        this.show_side_menu = !this.show_side_menu;
    }

    public toggleSideBar() {
        this.show_side_bar = !this.show_side_bar;
    }

}
