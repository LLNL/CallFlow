import tpl from '../../html/settings/index.html'

export default {
    name: "Settings",
    template: tpl,

    data: () => ({
        items: [],
    }),
    components: {
    },

    created() {
        this.items = this.$parent.settings
    },

    methods: {
        updateParentView(){
            console.log()
        }
    }
}