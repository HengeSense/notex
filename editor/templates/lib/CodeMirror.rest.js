///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

Ext.namespace ('Ext.ux.form');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

Ext.ux.form.CodeMirror.rest = function () {

    function onAfterRenderBeg (textarea) {

        CodeMirror.defineMode ("rst-plus", function (config, parserConfig) {
            var overlay = {
                token: function (stream, state) {
                    if (stream.match (/^\[(.+?)\]_\s|^\[(.+?)\]_$/))
                        return "rest-footnote";
                    if (stream.match (/^\.\.(\s+)\[(.+?)\]/))
                        return "rest-footnote";

                    while (stream.next () != null) {
                        if (stream.match (/^\[(.+?)\]_/, false))
                            return null;
                        if (stream.match (/^\.\.(\s+)\[(.+?)\]/, false))
                            return null;
                    }

                    return null;
                }
            };

            var mode = CodeMirror.getMode (
                config, parserConfig.backdrop || "text/x-rst"
            );

            return CodeMirror.overlayMode (mode, overlay);
        });

        return {
            indentUnit: 3,
            tabSize: 3,
            extraKeys: {
                'Ctrl-B' : function (codeEditor) { textarea.toggleStrong (); },
                'Ctrl-I' : function (codeEditor) { textarea.toggleItalic (); }
            }
        }
    }

    function onAfterRenderEnd (textarea) {}

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function cutToBuffer (buffer, name) {

        var selection = this.codeEditor.getSelection ();
        if (selection) {
            buffer[name] = selection;
            this.codeEditor.replaceSelection ('');
            return true;
        }

        return false;
    }

    function copyToBuffer (buffer, name) {

        var selection = this.codeEditor.getSelection ();
        if (selection) {
            buffer[name] = selection;
            return true;
        }

        return false;
    }

    function pasteFromBuffer (buffer, name) {

        if (buffer[name]) {
            this.codeEditor.replaceSelection (buffer[name]);
            return true;
        }

        return false;
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    var headingMarker = {
        1:'#', 2:'*', 3:'=', 4:'-', 5:'^', 6:'.. rubric::'
    }

    function applyHeading (level) {
        var cm = this.codeEditor;

        var marker = headingMarker[level];
        if (marker) {
            if (level != 6)
                applyHeading1to5.call (this, level);
            else
                applyHeading6.call (this);
        }

        function applyHeading1to5 (level) {
            removeHeading.call (this, function () {
                var sel = cm.getSelection ();
                if (sel) {
                    var head = '';
                    var size = (sel.length < 64) ? sel.length : 4;
                    for (var idx = 0; idx < size; idx++) head += marker;
                    var tpl = (level == 1) ? '{0}\n{1}\n{0}' : '{1}\n{0}';

                    cm.replaceSelection (String.format(tpl, head, sel));
                    cm.setCursor (cm.getCursor (true));
                }
            });
        }

        function applyHeading6 () {
            removeHeading.call (this, function () {
                var sel = cm.getSelection();
                if (sel) {
                    var rep = sel.replace(/\s+$/, '');
                    var tpl = marker + ' ' + '{0}';

                    cm.replaceSelection (String.format(tpl, rep));
                    cm.setCursor (cm.getCursor (true));
                }
            });
        }
    }

    function removeHeading (callback) {
        var cm = this.codeEditor;

        var beg = cm.getCursor (true);
        var end = cm.getCursor ();

        var tok = [], upp, low;
        for (var n = -3; n < 3; n++) {
            tok[n] = cm.getTokenAt ({line:end.line + n,ch:1});
            tok[n].line = end.line + n;

            if (tok[n].className == 'header')
                if (upp) { low = tok[n]; } else { upp = tok[n]; }
        }

        var sel = cm.getSelection ();
        if (sel) {

            removeHeading6.call (this);

            if (tok[-3] && tok[-3].className == 'header' && !low) return;
            if (tok[-2] && tok[-2].className == 'header' && !low) return;

            if (low) cm.removeLine (low.line);
            if (upp) cm.removeLine (upp.line);

            resetCursor.call (this);

            Ext.defer (function () {
                var cur = cm.getCursor ();
                var txt = cm.getLine (cur.line);

                cm.setSelection (
                    {line:cur.line, ch:0}, {line:cur.line, ch:txt.length}
                );

                if (callback) callback.call (this);
            }, 5, this)
        }

        function removeHeading6 () {
            var rx = new RegExp (headingMarker[6] + '(\\s*)');
            if (sel.match (rx)) {
                cm.replaceSelection (sel.replace (rx, ''));
            } else {
                var cur = cm.getCursor ();
                var txt = cm.getLine (cur.line);
                if (txt && txt.match (rx))
                    cm.setLine (cur.line, txt.replace (rx, ''));
            }
        }

        function resetCursor () {
            if (upp && low)
                cm.setCursor ({line:upp.line - 0, ch:0});
            else if (upp || low)
                cm.setCursor ({line:upp.line - 1, ch:0});
            else if (beg.line == end.line)
                cm.setCursor ({line:beg.line - 0, ch:0});
            else
                cm.setCursor ({line:end.line - 1, ch:0});
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function toggleStrong () {

        if (!this.cfgStrong) {
            this.cfgStrong = getToggleCfg ('strong', '**', '**');
        }

        toggleInline (this, this.cfgStrong);
    }

    function toggleItalic () {

        if (!this.cfgItalic) {
            this.cfgItalic = getToggleCfg ('em', '*', '*');
        }

        toggleInline (this, this.cfgItalic);
    }

    function toggleLiteral () {

        if (!this.cfgLiteral) {
            this.cfgLiteral = getToggleCfg ('string', '``', '``');
        }

        toggleInline (this, this.cfgLiteral);
    }

    function toggleSubscript () {

        if (!this.cfgSubscript) {
            this.cfgSubscript = getToggleCfg ('string-2', ':sub:`', '`');
        }

        toggleInline (this, this.cfgSubscript);
    }

    function toggleSupscript () {

        if (!this.cfgSupscript) {
            this.cfgSupscript = getToggleCfg ('string-2', ':sup:`', '`');
        }

        toggleInline (this, this.cfgSupscript);
    }

    function toggleInline (textarea, cfg) {

        var mode = textarea.codeEditor.getOption ('mode');
        if (mode == 'rst' || mode == 'rst-plus') {

            var cur = textarea.codeEditor.getCursor ();
            var tok = textarea.codeEditor.getTokenAt (cur);
            if (tok.className == cfg.cls && tok.string != cfg.markerEnd) {
                return; // no toggle if not all selected
            }
            if (tok.className != cfg.cls && tok.className) {
                return; // no toggle if something else
            }

            var sel = textarea.codeEditor.getSelection ();
            if (sel && sel.length > 0) {

                var rep = undefined;
                if (sel.match (cfg.inline)) {
                    rep = sel.replace (cfg.markerBegRx,'');
                    rep = rep.replace (cfg.markerEndRx,'');
                } else {
                    if (sel.match (/^:(.*?):`(.*)`$/)) {
                        return; // no toggle if another
                    } else {
                        rep = String.format (
                            '{0}{1}{2}', cfg.markerBeg, sel, cfg.markerEnd
                        );
                    }
                }

                textarea.codeEditor.replaceSelection (rep);
            }
        }
    }

    function getToggleCfg (cls, beg, end) {
        return {
            cls: cls,
            markerBeg: beg,
            markerEnd: end,
            markerBegRx: new RegExp ('^' + RegExp.quote (beg)),
            markerEndRx: new RegExp (RegExp.quote (end) + '$'),
            inline: new RegExp (
                '^' + RegExp.quote (beg) + '(.*)' + RegExp.quote (end) + '$'
            )
        }
    }

    RegExp.quote = function(str) {
        return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    };

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function toLowerCase () {
        var selection = this.codeEditor.getSelection ();
        this.codeEditor.replaceSelection (selection.toLowerCase ());
    }

    function toUpperCase () {
        var selection = this.codeEditor.getSelection ();
        this.codeEditor.replaceSelection (selection.toUpperCase ());
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function toggleBulletList () {
        var sel = this.codeEditor.getSelection ();
        if (sel) {
            allPoints.call (this,
                '+ ', /^(\s*)(\+)(\s+)/, /^(\s*)(.*)/, sel
            );
        } else {
            nextPoint.call (this, '\n{0}+ \n', /^(\s*)\+(\s+)$/);
        }
    }

    function toggleNumberList () {
        var sel = this.codeEditor.getSelection ();
        if (sel) {
            allPoints.call (this,
                '#. ', /^(\s*)([0-9]+\.)(\s+)/, /^(\s*)(.*)/, sel
            );
        } else {
            nextPoint.call (this, '\n{0}#. \n', /^(\s*)[#0-9]\.(\s+)$/);
        }
    }

    function allPoints (tpl, rx1, rx2, sel) {
        var rest = ''; CodeMirror.splitLines (sel)

            .filter(function (el) { return el;})
            .forEach(function (el, idx) {

                var group = el.match (rx1)
                if (group) {
                    rest += group[1] + el.replace (group[0], '') + '\n';
                } else {
                    var group = el.match (rx2)
                    if (group) {
                        rest += String.format ('{0}{1}{2}\n',
                            group[1], String.format (tpl, idx + 1), group[2]
                        );
                    }
                }
            });

        this.codeEditor.replaceSelection (rest);
    }

    function nextPoint (tpl, rx) {
        var curr = this.codeEditor.getCursor ();
        var text = this.codeEditor.getLine (curr.line);
        var rest = tpl;

        var group = text.match (/^(\s+)/);
        if (group && group[0]) {
            rest = String.format (rest, group[0]);
        } else {
            rest = String.format (rest, '');
        }

        rest = fix_preceeding_whitespace.call (this, rest, text, curr);
        rest = fix_succeeding_whitespace.call (this, rest, text, curr);

        this.codeEditor.replaceSelection (rest);

        var curr = this.codeEditor.getCursor ();
        var text = this.codeEditor.getLine (curr.line);
        if (!text.match (rx)) {
            this.codeEditor.setCursor ({
                line:curr.line - 2, ch:text.length - 1
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function decreaseLineIndent () {
        CodeMirror.commands ['indentLess'](this.codeEditor);
    }

    function increaseLineIndent () {
        CodeMirror.commands ['indentMore'](this.codeEditor);
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    var FIGURE_TYPE = 'figure';
    var IMAGE_TYPE = 'image';

    function insertFigure (node) {
        return insertPicture (this, node, FIGURE_TYPE);
    }

    function insertImage (node) {
        return insertPicture (this, node, IMAGE_TYPE);
    }

    function insertPicture (textarea, node, type) {

        function onAfterRender (combobox) {
            var tree = Ext.getCmp ('reportManager.tree.id');

            if (node)
                while (node.parentNode != tree.root) {
                    node = node.parentNode;
                }
            else
                node = tree.root;

            tree.getAllLeafs (node, function (node, leaf) {
                if (tree.isImage (leaf)) {
                    var pathNode = node.getPath ('text');
                    var pathLeaf = leaf.getPath ('text')
                        .replace (pathNode + '/', '');

                    combobox.store.loadData ([[pathLeaf]], true);
                }
            });
        }

        var cmbFilename = new Ext.form.ComboBox ({
            id : "cmbFilenameId",
            fieldLabel : 'File',
            name : 'filename',
            allowBlank : false,
            mode : 'local',
            store : [],
            triggerAction : 'all',
            selectOnFocus : true,
            editable : true,
            typeAhead: true,
            emptyText:'select or enter a file name',

            listeners : {
                afterrender : onAfterRender
            }
        });

        Ext.apply (Ext.form.VTypes, {
            natural: function (val, field) { return /^[\d]+$/.test(val); },
            naturalText: 'Not a positive number.',
            naturalMask: /[\d]/i
        });

        var txtScale = new Ext.form.TextField ({
            allowBlank : false,
            fieldLabel : 'Scale [%]',
            id : "txtScaleId",
            name : 'caption',
            value : '100',
            width : '100%',
            vtype : 'natural'
        });

        var cmbAlignment = new Ext.form.ComboBox ({
            id : "cmbAlignmentId",
            fieldLabel : 'Alignment',
            name : 'alignment',
            allowBlank : false,
            store : ['left', 'center', 'right'],
            mode : 'local',
            triggerAction : 'all',
            selectOnFocus : true,
            editable : false,
            value : 'center'
        });

        var txtCaption = new Ext.form.TextArea ({
            id : "txtCaptionId",
            fieldLabel: 'Caption',
            name: 'caption',
            width: '100%',
            emptyText:'optional'
        });

        function onAfterLayout (panel) {

            panel.un ('afterlayout', onAfterLayout);

            var txtScaleWidth = txtScale.getWidth ();
            var cmbFilenameWidth = cmbFilename.getWidth ();
            var cmbAlignmentWidth = cmbAlignment.getWidth ();

            if (cmbFilenameWidth < txtScaleWidth)
                cmbFilename.setWidth (txtScaleWidth);
            if (cmbAlignmentWidth < txtScaleWidth)
                cmbAlignment.setWidth (txtScaleWidth);
        }

        var formPanel = new Ext.FormPanel ({
            frame: true,
            items: (type == FIGURE_TYPE)
                ? [cmbFilename, txtScale, cmbAlignment, txtCaption]
                : [cmbFilename, txtScale, cmbAlignment],
            listeners: { afterlayout: onAfterLayout }
        });

        var win = new Ext.Window ({
            border: false,
            iconCls: 'icon-picture_add',
            modal: true,
            resizable: false,
            title: 'Insert ' + (type == FIGURE_TYPE) ? 'Figure' : 'Image',
            width: 384,

            items: [formPanel],

            buttons: [{
                text: 'Insert',
                iconCls: 'icon-tick',
                handler: insert
            },{
                text: 'Cancel',
                iconCls: 'icon-cross',
                handler: cancel
            }]
        });

        function insert () {
            var cm = textarea.codeEditor;

            if (!cmbFilename.validate ()) return;
            var filename = cmbFilename.getValue ();
            if (!txtScale.validate ()) return;
            var scale = txtScale.getValue ();
            if (!cmbAlignment.validate ()) return;
            var alignment = cmbAlignment.getValue ();
            if (!txtCaption.validate ()) return;
            var caption = txtCaption.getValue ();

            var rest = (type == FIGURE_TYPE)
                ? String.format ('\n.. figure:: {0}\n', filename)
                : String.format ('\n.. image:: {0}\n', filename);

            if (scale)
                rest += String.format ('   :scale: {0} %\n', scale);
            if (alignment)
                rest += String.format ('   :align: {0}\n', alignment);

            if (caption && type == FIGURE_TYPE) {
                caption = caption.replace (/\n/g, '\n   '); // multi-line
                caption = caption.replace (/\s+$/, '');
                rest += '\n' + String.format ('   {0}\n', caption);
            }

            win.close ();

            var cur = cm.getCursor ();
            var txt = cm.getLine (cur.line);

            rest = fix_preceeding_whitespace.call (this, rest, txt, cur);
            rest = fix_succeeding_whitespace.call (this, rest, txt, cur);

            cm.replaceSelection (rest);
            cm.setCursor (cm.getCursor ());
            cm.focus ();
        }

        function cancel () {
            win.close ();
        }

        win.show (textarea);
    }

    ///////////////////////////////////////////////////////////////////////////

    function insertHyperlink () {

        var txtUrl = new Ext.form.TextField ({
            fieldLabel: 'URL',
            name: 'url',
            vtype: 'url',
            width: '100%'
        });

        var txtLabel = new Ext.form.TextField ({
            fieldLabel: 'Label',
            name: 'label',
            width: '100%',
            value: this.codeEditor.getSelection (),
            emptyText: 'optional'
        });

        var pnlHyperlink = new Ext.FormPanel ({
            labelWidth: 64,
            frame: true,
            items: [txtUrl, txtLabel]
        });

        var win = new Ext.Window ({

            border: false,
            iconCls: 'icon-link_add',
            modal: true,
            resizable: false,
            title: 'Insert Hyperlink',
            width: 384,

            items: [pnlHyperlink],

            buttons: [{
                text: 'Insert',
                iconCls: 'icon-tick',
                handler: insert,
                scope: this
            },{
                text: 'Cancel',
                iconCls: 'icon-cross',
                handler: cancel,
                scope: this
            }]
        });

        function insert () {

            if (!txtUrl.validate ()) return;
            var url = txtUrl.getValue ();
            if (!txtLabel.validate ()) return;
            var label = txtLabel.getValue ();

            if (label)
                this.codeEditor.replaceSelection (
                    String.format ('`{0} <{1}>`_', label, url));
            else if (url)
                this.codeEditor.replaceSelection (url);

            win.close ();

            var cur = this.codeEditor.getCursor ();
            this.codeEditor.setSelection (cur, cur);
            this.codeEditor.focus ();
        }

        function cancel () {
            win.close ();
        }

        win.show (this);
        txtUrl.focus (true, 25);
    }

    ///////////////////////////////////////////////////////////////////////////

    function insertFootnote () {
        var cur = this.codeEditor.getCursor ();

        var rng = this.codeEditor.getRange (
            {line:cur.line, ch: cur.ch-1},
            {line:cur.line, ch: cur.ch+1}
        );

        var prefix = (rng.match (/^\s/) || (cur.ch -1 < 0))
            ? '' : ' ';
        var suffix = (rng.match (/\s$/))
            ? '' : ' ';
        var anchor = String.format (
            '{0}{1}{2}', prefix, '[#]_', suffix
        );

        if (this.codeEditor.lineCount () <= cur.line+1) {
            this.codeEditor.replaceSelection (anchor + '\n');
            this.codeEditor.setCursor ({line:cur.line+1,ch:0})
            this.codeEditor.replaceSelection ('\n.. [#] \n');
        } else {
            this.codeEditor.replaceSelection (anchor);
            this.codeEditor.setCursor ({line:cur.line+1,ch:0})
            this.codeEditor.replaceSelection ('\n.. [#] \n');

            var nxt = this.codeEditor.getCursor ();
            this.codeEditor.setCursor (nxt);

            if (this.codeEditor.getLine (nxt.line)) {
                this.codeEditor.replaceSelection ('\n');
            }
        }

        this.codeEditor.setCursor ({line:cur.line+2,ch:7});
    }

    ///////////////////////////////////////////////////////////////////////////

    function insertHorizontalLine () {
        var cm = this.codeEditor;

        var rest = '\n----\n';
        var cur = cm.getCursor ();
        var txt = cm.getLine (cur.line);

        rest = fix_preceeding_whitespace.call (this, rest, txt, cur);
        rest = fix_succeeding_whitespace.call (this, rest, txt, cur);

        cm.replaceSelection (rest);
        cm.setCursor (cm.getCursor ());
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function fix_preceeding_whitespace (rest, text, cursor) {
        var cm = this.codeEditor;

        if (cursor.ch > 0 && !text.match (/^\s+$/)) {
            rest = '\n' + rest;
        } else {
            var prev_txt = cm.getLine (cursor.line - 1);
            if (prev_txt == '' || (prev_txt && prev_txt.match (/^\s+$/))) {
                rest = rest.replace (/^\n/, '');
            }

            if (text.match (/^\s+$/)) cm.setLine (cursor.line, '');
        }

        return rest;
    }

    function fix_succeeding_whitespace (rest, text, cursor) {
        var cm = this.codeEditor;

        if (cursor.ch < text.length) {
            rest += '\n'
        } else {
            var next_txt = cm.getLine (cursor.line + 1);
            if (next_txt == '' || ( next_txt && next_txt.match (/^\s+$/))) {
                rest = rest.replace (/\n$/, '');
            }
        }

        return rest;
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    return Ext.extend (Ext.ux.form.CodeMirror, {

        onAfterRenderBeg: onAfterRenderBeg,
        onAfterRenderEnd: onAfterRenderEnd,

        cutToBuffer: cutToBuffer,
        copyToBuffer: copyToBuffer,
        pasteFromBuffer: pasteFromBuffer,

        applyHeading: applyHeading,

        toggleStrong: toggleStrong,
        toggleItalic: toggleItalic,
        toggleLiteral: toggleLiteral,
        toggleSubscript: toggleSubscript,
        toggleSupscript: toggleSupscript,

        toLowerCase: toLowerCase,
        toUpperCase: toUpperCase,

        toggleBulletList: toggleBulletList,
        toggleNumberList: toggleNumberList,

        decreaseLineIndent: decreaseLineIndent,
        increaseLineIndent: increaseLineIndent,

        insertFigure: insertFigure,
        insertImage: insertImage,
        insertHyperlink: insertHyperlink,
        insertFootnote: insertFootnote,
        insertHorizontalLine: insertHorizontalLine
    });
}();

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

Ext.reg ('ux-codemirror-rest', Ext.ux.form.CodeMirror.rest);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
