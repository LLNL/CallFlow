import tpl from '../html/uploadButton.html'

export default {
    template: tpl,
    props: {
        value: {
            type: [Array, String]
        },
        accept: {
            type: String,
            default: '*'
        },
        label: {
            type: String,
            default: 'choose_file'
        },
        required: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        },
        multiple: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            filename: '',
            title: "Upload the Config file (JSON format)."
        }
    },
    watch: {
        value(v) {
            this.filename = v
        }
    },
    mounted() {
        this.filename = this.value
    },
    methods: {
        getFormData(files) {
            const forms = []
            for (const file of files) {
                const form = new FormData()
                form.append('data', file, file.name)
                forms.push(form)
            }
            return forms
        },
        onFocus() {
            if (!this.disabled) {
                this.$refs.fileInput.click()
            }
        },
        onFileChange($event) {
            const files = $event.target.files || $event.dataTransfer.files
            const form = this.getFormData(files)
            if (files) {
                if (files.length > 0) {
                    this.filename = [...files].map(file => file.name).join(', ')
                } else {
                    this.filename = null
                }
            } else {
                this.filename = $event.target.value.split('\\').pop()
            }
            this.$emit('input', this.filename)
            this.$emit('formData', form)
        }
    }
}