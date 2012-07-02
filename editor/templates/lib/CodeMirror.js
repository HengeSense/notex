Ext.namespace ('Ext.ux.form');

Ext.ux.form.CodeMirror = Ext.extend (Ext.form.TextArea, {
    initComponent: function () {
        Ext.ux.form.CodeMirror.superclass.initComponent.apply (this, arguments);

        this.on ({
            resize : function (ta, width, height) {
                if (this.codeEditor) {
                    this.codeEditor.refresh ();
                }
            },

            afterrender : function () {
                this.codeEditor = new CodeMirror.fromTextArea (this.el.dom, {
                    lineWrapping: true,
                    lineNumbers: true,
                    mode: this.initialConfig.mode
                });

                this.codeEditor.setValue (this.initialConfig.value);
                this.setFontSize (this.initialConfig.fontSize)
            }
        });
    },

    getValue: function () {
        if (this.codeEditor) {
            return this.codeEditor.getValue ();
        } else {
            return this.initialConfig.value;
        }
    },

    setValue: function (value) {
        if (this.codeEditor) {
            this.codeEditor.setValue (value);
        }
    },

    setFontSize: function (value) {
        if (this.codeEditor) {
            var codeEditorEl = this.el.next ();
            if (codeEditorEl) {
                codeEditorEl.setStyle ('font-size', value);
                this.codeEditor.refresh ();
            }
        }
    }
});

Ext.reg ('ux-codemirror', Ext.ux.form.CodeMirror);