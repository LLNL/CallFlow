import { Store as VuexStore } from "vuex";

export interface GlobalState {
}

export type Store = VuexStore<GlobalState>;

declare module "vue/types/vue" {

    export interface ComponentOptions {
        $store: Store;
    }
}
