var reportManager = {
    util: reportManagerUtil,
    crud: reportManagerCrud,
    tree: reportManagerTree,
    task: reportManagerTask
}

var reportManager = function () {

    // #########################################################################
    // #########################################################################

    var tbar = { items: [{
        iconCls : 'icon-disk',
        tooltip : '<b>Save</b><br/>Save selected file (to <i>remote</i> storage)',
        handler : function (button, event) {
            Ext.getCmp ('reportManager.id').fireEvent ('saveTab')
        }
    },{
        iconCls : 'icon-folder_page',
        tooltip : '<b>Open</b><br/>Open a text or image file (from <i>local</i> storage)',
        handler : function (button, event) {
            Ext.getCmp ('reportManager.id').fireEvent ('openFile')
        }
    },'-',{
        iconCls : 'icon-add',
        tooltip : '<b>Add</b><br/>Add a new report, folder or file',
        split   : true,
        menu    : {
            xtype : 'menu',
            plain : true,

            items : [{
                iconCls : 'icon-report',
                text    : 'Report',
                handler : function (button, event) {
                    Ext.getCmp ('reportManager.id').fireEvent ('addReport')
                }
            },{
                iconCls : 'icon-folder',
                text    : 'Folder',
                handler : function (button, event) {
                    Ext.getCmp ('reportManager.id').fireEvent ('addFolder')
                }
            },{
                iconCls : 'icon-page',
                text    : 'Plain Text',
                handler : function (button, event) {
                    Ext.getCmp ('reportManager.id').fireEvent ('addTextFile')
                }
            }]
        }
    },{
        iconCls : 'icon-pencil',
        tooltip : '<b>Rename</b><br/>Rename selected report, folder or file',
        handler : function (button, event) {
            Ext.getCmp ('reportManager.id').fireEvent ('renameSelectedNode')
        }
    },{
        iconCls : 'icon-delete',
        tooltip : '<b>Delete</b><br/>Delete selected report, folder or file',
        handler : function (button, event) {
            Ext.getCmp ('reportManager.id').fireEvent ('deleteSelectedNode')
        }
    },'-',{
        iconCls : 'icon-page_white_zip',
        tooltip : '<b>Import</b><br/>Open a report from a <b>ZIP</b> archive (at <i>local</i> storage)',
        handler : function (button, event) {
            Ext.getCmp ('reportManager.id').fireEvent ('importReport')
        }
    },{
        id : 'btn.export.report-manager.id',
        iconCls : 'icon-report_go',
        tooltip : '<b>Export</b><br/>Save selected report (to <i>local</i> storage)',
        split : true,

        handler : function (button, event) {
            Ext.getCmp ('reportManager.id').fireEvent (
                'exportReport', urls.exportReport
            )
        },

        menu : {
          xtype : 'menu',
          plain : true,

          items : [{
              id : 'btn.export-text.report-manager.id',
              iconCls : 'icon-page_white_text',
              text : 'Text Files',
              handler : function (button, event) {
                  Ext.getCmp ('reportManager.id').fireEvent ('exportText')
              }
          },{
              id : 'btn.export-latex.report-manager.id',
              iconCls : 'icon-page_white_code',
              text : 'Latex Files',
              handler : function (button, event) {
                  Ext.getCmp ('reportManager.id').fireEvent ('exportLatex')
              }
          },{
              id : 'btn.export-pdf.report-manager.id',
              iconCls : 'icon-page_white_acrobat',
              text : 'PDF Report',
              handler : function (button, event) {
                  Ext.getCmp ('reportManager.id').fireEvent ('exportPdf')
              }
          },{
              id : 'btn.export-html.report-manager.id',
              iconCls : 'icon-page_white_world',
              text : 'HTML Files',
              handler : function (button, event) {
                  Ext.getCmp ('reportManager.id').fireEvent ('exportHtml')
              }
          }]
        }
    },'-',{
        id : 'btnMoveUp',
        iconCls : 'icon-arrow_up',
        tooltip : '<b>Move Up</b><br/>Move selected report, folder or file up in tree',
        handler : function (button, event) {
            Ext.getCmp ('reportManager.id').fireEvent ('moveSelectedNodeUp')
        }
    },{
        id : 'btnMoveDown',
        iconCls : 'icon-arrow_down',
        tooltip : '<b>Move Down</b><br/>Move selected report, folder or file down in tree',
        handler : function (button, event) {
            Ext.getCmp ('reportManager.id').fireEvent ('moveSelectedNodeDown')
        }
    }]}

    // #########################################################################
    // #########################################################################

    var prompt_message = reportManager.util.prompt_message;
    var error_msg = reportManager.util.error_message;
    var resource = reportManager.util.resource;

    // #########################################################################
    // #########################################################################

    function _importReport () {

        dialog.openFile.setTitle ('Open ZIP Archive');
        dialog.openFile.setIconClass ('icon-report_add');
        dialog.openFile.execute ({
            success: function (file) {

                var progressBar = Ext.getCmp ('progressBarId')
                progressBar.show ()
                progressBar.setMode ('import')
                progressBar.wait ({
                    increment : progressBar.increment,
                    interval : progressBar.interval
                })

                var xhr = new XMLHttpRequest ()

                xhr.open (
                    "POST", urls.importReport.replace ('=', file.name), true
                );

                xhr.onerror = function (event) {
                    progressBar.reset (true)
                    if (this.response) {
                        var response = Ext.util.JSON.decode (this.response)
                        import_failure (file.name, response.message);
                    } else {
                        import_failure (file.name, resource.LARGE_FILE);
                    }
                }

                xhr.onload = function (event) {
                    progressBar.reset (true)
                    if (this.status == 200) {
                        var response = Ext.util.JSON.decode (this.response)
                        if (response.success) {
                            var tree = Ext.getCmp ('reportManager.tree.id')
                            tree.getLoader ().load (tree.root, null, this)
                        } else {
                            import_failure (file.name, response.message);
                        }
                    } else {
                        import_failure (file.name, resource.UNKNOWN_ERROR);
                    }
                }

                xhr.setRequestHeader (
                    'X-CSRFToken', Ext.util.Cookies.get ('csrftoken')
                );

                xhr.send (file);
            },

            failure: function (file) {
                import_failure (file.name, resource.INVALID_FILE);
            }
        });
    }

    function import_failure (filename, message) {
        error_msg (String.format (
            'importing <i>{0}</i> failed: {1}', filename, message
        ));
    }

    // #########################################################################
    // #########################################################################

    function _exportReport (url) {

        var statusBar = Ext.getCmp ('statusBarId');
        var progressBar = Ext.getCmp ('progressBarId');

        var tree = Ext.getCmp ('reportManager.tree.id');
        var model = tree.getSelectionModel ();
        var node = model.getSelectedNode ();

        if (node == undefined) {
            return;
        }

        _disableExport ();

        statusBar.showBusy ({text: 'Please wait ..'});
        progressBar.show ();
        progressBar.setMode ('export');
        progressBar.wait ({
            increment : progressBar.increment,
            interval : progressBar.interval
        });

        var _onSuccess = function (xhr, opts) {
            var body = Ext.getBody()

            var frame_old = Ext.get ('iframe');
            if (frame_old != null) {
                Ext.destroy (frame_old);
            }

            var frame = body.createChild ({
                tag : 'iframe',
                cls : 'x-hidden',
                id : 'iframe',
                name : 'iframe'
            });

            var form = body.createChild ({
                tag : 'form',
                cls : 'x-hidden',
                id : 'form',
                method : 'POST',
                action : url.replace ('=', node.id),
                target : 'iframe'
            });

            form.insertHtml ('beforeend', "{% csrf_token %}");
            progressBar.reset (true);
            statusBar.clearStatus ({useDefaults:true});
            form.dom.submit ();
            _enableExport ();
        }

        var _onFailure = function (xhr, opts, res) {
            progressBar.reset (true);
            statusBar.clearStatus ({useDefaults:true});
            export_failure (res.name, resource.UNKNOWN_ERROR);
            _enableExport ();
        }

        Ext.Ajax.request ({
            url : url.replace ('=', node.id) + "?refresh",
            callback : function (opts, status, xhr) {
                if (status) {
                    var res = Ext.decode (xhr.responseText)[0];
                    if (res.success) {
                        _onSuccess (xhr, opts);
                    } else {
                        _onFailure (xhr, opts, res)
                    }
                } else {
                    _onFailure (xhr, opts, {name: undefined});
                }
            }
        });
    }

    function _exportText () {
        this.fireEvent ('exportReport', urls.exportText)
    }

    function _exportLatex () {
        this.fireEvent ('exportReport', urls.exportLatex)
    }

    function _exportPdf () {
        this.fireEvent ('exportReport', urls.exportPdf)
    }
    
    function _exportHtml () {
        this.fireEvent ('exportReport', urls.exportHtml)
    }

    function _getExportButtons () {
        return [
            Ext.getCmp ('btn.export.report-manager.id'),
            Ext.getCmp ('btn.export-text.report-manager.id'),
            Ext.getCmp ('btn.export-latex.report-manager.id'),
            Ext.getCmp ('btn.export-pdf.report-manager.id'),
            Ext.getCmp ('btn.export-html.report-manager.id'),
            Ext.getCmp ('btn.export.editor.id'),
            Ext.getCmp ('btn.export-text.editor.id'),
            Ext.getCmp ('btn.export-latex.editor.id'),
            Ext.getCmp ('btn.export-pdf.editor.id'),
            Ext.getCmp ('btn.export-html.editor.id')
        ];
    }

    function _enableExport () {
        var buttons = _getExportButtons ();
        for (var idx in buttons) {
            var button = buttons[idx];
            if (button.enable) {
                button.enable ();
            }
        }
    }

    function _disableExport () {
        var buttons = _getExportButtons ();
        for (var idx in buttons) {
            var button = buttons[idx];
            if (button.disable) {
                button.disable ();
            }
        }
    }

    function export_failure (filename, message) {
        error_msg (String.format (
            'exporting <i>{0}</i> failed: {1}', filename, message
        ));
    }

    // #########################################################################
    // #########################################################################

    function _openFile () {

        var tree = Ext.getCmp ('reportManager.tree.id')
        var model = tree.getSelectionModel ()
        var node = model.getSelectedNode ()

        if (node == undefined) {
            return;
        }

        dialog.openFile.setTitle ('Open Text/Image File')
        dialog.openFile.setIconClass ('icon-page_white_add');
        dialog.openFile.execute ({
            success: _openFileOnSuccess,
            failure: _openFileOnFailure
        });
    }

    function _openFileOnSuccess (file) {

        var tree = Ext.getCmp ('reportManager.tree.id')
        var selectionModel = tree.getSelectionModel ()
        var selectedNode = selectionModel.getSelectedNode ()

        var fileInfo = {
            id : Math.uuid (),
            title : file.name
        }

        var node = new Ext.tree.TreeNode ({
            'text' : String.format ("<i>{0}</i>", fileInfo.title),
            'id' : fileInfo.id,
            'cls' : "file",
            'leaf' : true,
            'expanded' : false
        })

        if (String (file.type).match (/^image(.*)/) == "image") {
            _openImageFile (file, fileInfo, node, tree, selectedNode);
        } else { // assume text
            _openTextFile (file, fileInfo, node, tree, selectedNode);
        }
    }

    function _openFileOnFailure () {
        open_failure (undefined, resource.INVALID_FILE);
    }

    function _openImageFile (file, fileInfo, node, tree, selectedNode) {

        var imageReader = new FileReader();
        imageReader.onerror = function (e) {
            open_failure (file.name, resource.READ_ERROR);
        }

        imageReader.onload = function (e) {
            if (e.loaded >= 524288) {
                open_failure (file.name, resource.LARGE_FILE);
                return;
            }

            fileInfo.iconCls = 'icon-image'
            fileInfo.text = e.target.result
            fileInfo.save = true

            node.attributes['iconCls'] = fileInfo.iconCls
            node.attributes['data'] = fileInfo.text

            tree.fireEvent ('createNode', node, {refNode: selectedNode}, {
                success: function (args) {
                    Ext.getCmp ('editor.id').fireEvent (
                        'createImageTab', fileInfo
                    );
                },

                failure: function (args) {
                    open_failure (file.name, resource.NO_NEW_NODE);
                }
            });
        }

        imageReader.readAsDataURL (file);
    }

    function _openTextFile (file, fileInfo, node, tree, selectedNode) {

        var textReader = new FileReader ();
        textReader.onerror = function (e) {
            open_failure (file.name, resource.READ_ERROR);
        }

        textReader.onload = function (e) {
            if (e.loaded >= 524288) {
                open_failure (file.name, resource.LARGE_FILE);
                return;
            }

            fileInfo.iconCls = 'icon-page'
            fileInfo.text = e.target.result
            fileInfo.save = true

            node.attributes['iconCls'] = fileInfo.iconCls
            node.attributes['data'] = fileInfo.text

            tree.fireEvent ('createNode', node, {refNode: selectedNode}, {
                success: function (args) {
                    Ext.getCmp ('editor.id').fireEvent (
                        'createTextTab', fileInfo
                    );
                },

                failure: function (args) {
                    open_failure (file.name, resource.NO_NEW_NODE);
                }
            });
        }

        textReader.readAsText (file);
    }

    function open_failure (filename, message) {
        error_msg (String.format (
            'Opening <i>{0}</i> failed: {1}!', filename, message
        ));
    }

    // #########################################################################
    // #########################################################################

    function _saveTab (tab, skipMask) {

        if (tab == undefined) {
            tab = Ext.getCmp ('editor.id').getActiveTab ()
        }

        if (tab == undefined) {
            return;
        }

        var tree = Ext.getCmp ('reportManager.tree.id')
        var node = tree.getNodeById (tab.id)

        if (tree.isText (node)) {
            _saveTextTab (tab, skipMask);
            return;
        }

        if (tree.isImage (node)) {
            _saveImageTab (tab, skipMask);
            return;
        }
    }

    function _saveTextTab (tab, skipMask) {

        if (tab == undefined) {
            tab = Ext.getCmp ('editor.id').getActiveTab ()
        }

        if (tab == undefined) {
            return;
        }

        if (skipMask == undefined || skipMask != true) {
            tab.el.mask ('Please wait', 'x-mask-loading')
        }

        var tree = Ext.getCmp ('reportManager.tree.id')
        var node = tree.getNodeById (tab.id)

        reportManager.crud.update ({
            leafId : node.id,
            nodeId : node.parentNode.id,
            name : node.text.replace('<i>','').replace('</i>',''),
            data : tab.getData (),
            rank : node.parentNode.indexOf (node)
        }, urls.updateText)
    }

    function _saveImageTab (tab, skipMask) {
        return; // read-only image viewer
    }
    
    // #########################################################################
    // #########################################################################

    function _addReport () {

        var tree = Ext.getCmp ('reportManager.tree.id')
        var rank = tree.root.childNodes.indexOf (tree.root.lastChild)

        var cmbDocumentType = new Ext.form.ComboBox ({
            fieldLabel : 'Document',
            name : 'document',
            allowBlank : false,
            store : ['article', 'report'],
            mode : 'local',
            triggerAction : 'all',
            selectOnFocus : true,
            editable : false
        });

        var cmbFontSize = new Ext.form.ComboBox ({
            fieldLabel : 'Font Size',
            name : 'fontSize',
            allowBlank : false,
            store : ['10pt', '11pt', '12pt'],
            mode : 'local',
            triggerAction : 'all',
            selectOnFocus : true,
            editable : false
        });

        var cmbColumns = new Ext.form.ComboBox ({
            fieldLabel : 'Columns',
            name : 'columns',
            allowBlank : false,
            store : [1, 2],
            mode : 'local',
            triggerAction : 'all',
            selectOnFocus : true,
            editable : false
        });

        var cmbContent = new Ext.form.ComboBox ({
            fieldLabel : 'Content',
            name : 'content',
            allowBlank : false,
            store : ['empty', 'tutorial'],
            mode : 'local',
            triggerAction : 'all',
            selectOnFocus : true,
            editable : false
        });

        var propertyGrid = new Ext.grid.PropertyGrid ({
            layout: 'fit',
            autoHeight: true,
            propertyNames : {
                project : 'Project',
                authors : 'Author(s)',
                documentType : 'Document Type',
                fontSize : 'Font Size',
                columns : 'Columns',
                title : 'Title',
                toc : 'Table of Content',
                index : 'Index',
                content : 'Content'
            },
            source : {
                project : 'PROJECT',
                authors : 'AUTHORs',
                documentType : 'article',
                fontSize : '12pt',
                columns : 2,
                title : true,
                toc : true,
                index : false,
                content : 'tutorial'
            },
            viewConfig : {
                forceFit : true,
                scrollOffset : 2
            },
            customEditors: {
                documentType : new Ext.grid.GridEditor (cmbDocumentType),
                fontSize : new Ext.grid.GridEditor (cmbFontSize),
                columns : new Ext.grid.GridEditor (cmbColumns),
                content : new Ext.grid.GridEditor (cmbContent)
            }
        });

        delete propertyGrid.getStore().sortInfo;
        propertyGrid.getColumnModel().getColumnById('name').sortable = false

        var win = new Ext.Window ({

            title : 'Create Report',
            iconCls : 'icon-report',
            plain : true,
            resizable : false,
            modal : true,
            width: 512,

            buttons: [{
                text : 'Cancel',
                iconCls : 'icon-cross',
                handler : function () { win.close () }
            },{
                text : 'Create',
                iconCls : 'icon-report_add',
                handler : function () {
                    tree.el.mask ('Please wait', 'x-mask-loading')
                    var source = propertyGrid.getSource ()
                    reportManager.crud.create (urls.createProject, {
                        nodeId : tree.root.id,
                        data : Ext.encode (source),
                        rank : rank + 1
                    }); win.close ()
                }
            }],

            items : [propertyGrid]
        });

        win.show (this);
    }

    // #########################################################################
    // #########################################################################

    function _addFolder () {

        var tree = Ext.getCmp ('reportManager.tree.id')
        var model = tree.getSelectionModel ()
        var node = model.getSelectedNode ()

        if (node == undefined) {
            return;
        }

        if (node.isLeaf ()) {
            node = node.parentNode
        }

        function _callback (btn, text) {
            if (btn == 'ok') {
                tree.el.mask ('Please wait', 'x-mask-loading');
                var rank = node.childNodes.indexOf (node.lastChild);

                reportManager.crud.create (urls.createFolder, {
                    nodeId : node.id,
                    name : text,
                    rank : rank + 1
                });
            }
        }

        prompt_message ('Create Folder', 'Enter a name:', _callback);
    }

    // #########################################################################
    // #########################################################################

    function _addTextFile () {

        var tree = Ext.getCmp ('reportManager.tree.id')
        var model = tree.getSelectionModel ()
        var node = model.getSelectedNode ()

        if (node == undefined) {
            return;
        }

        if (node.isLeaf()) {
            node = node.parentNode
        }

        function _callback (btn, text) {
            if (btn == 'ok') {
                tree.el.mask ('Please wait', 'x-mask-loading')
                var rank = node.childNodes.indexOf (node.lastChild)

                reportManager.crud.create (urls.createText, {
                    nodeId : node.id,
                    name : text,
                    rank : rank + 1,
                    data : '..'
                });
            }
        }

        prompt_message ('Create Text', 'Enter a name:', _callback);
    }

    // #########################################################################
    // #########################################################################

    function _renameSelectedNode () {

        var tree = Ext.getCmp ('reportManager.tree.id');
        var model = tree.getSelectionModel ();
        var node = model.getSelectedNode ();

        if (node == undefined) {
            return;
        }

        var text = node.text
            .replace('<i>','')
            .replace('</i>','');

        function _callback (btn, text) {
            if (btn == 'ok') {
                tree.el.mask ('Please wait', 'x-mask-loading');

                var tabs = Ext.getCmp ('editor.id');
                var tab = tabs.findById (node.id);
                if (tab != undefined) {
                    tab.el.mask ('Please wait', 'x-mask-loading');
                }

                if (Math.uuidMatch (node.id)) {
                    node.setText (String.format ("<i>{0}</i>", text));
                    if (tree != undefined) {
                        tree.el.unmask ();
                    }

                    if (tab != undefined) {
                        tab.setTitle (text);
                        tab.el.unmask ();
                    }
                } else {
                    reportManager.crud.rename ({
                        nodeId : node.id,
                        name : text
                    });
                }
            }
        }

        prompt_message ('Rename', 'Enter a name:', _callback, text);
    }

    // #########################################################################
    // #########################################################################

    function _deleteSelectedNode () {

        var tree = Ext.getCmp ('reportManager.tree.id');
        var model = tree.getSelectionModel ();
        var node = model.getSelectedNode ();

        if (node == undefined) {
            return;
        }

        function _onConfirm (id) {
            if (id != 'yes') {
                return;
            }

            tree.fireEvent (
                'deleteNode', node, {destroy: true}, {
                    success : function (args) {
                        Ext.getCmp ('editor.id').fireEvent (
                            'deleteTab', { 'id' : args.node.id }
                        );

                        reportManager.crud.del ({
                            id : args.node.id
                        });
                    },

                    failure : function (args) {
                        error_msg (resource.NO_NODE);
                    }
                }
            );
        }

        Ext.Msg.show ({
            title : 'Delete',
            iconCls : 'icon-delete',
            msg : 'Are you sure you want to delete the selection?',
            buttons : Ext.Msg.YESNO,
            fn : _onConfirm,
            scope : this
        });
    }

    // #########################################################################
    // #########################################################################

    function _moveSelectedNodeUp () {

        var tree = Ext.getCmp ('reportManager.tree.id');
        var model = tree.getSelectionModel ();
        var node = model.getSelectedNode ();

        if (node == undefined) {
            return;
        }

        if (tree.isReport (node.previousSibling)) {
            return;
        }

        var prev = _prev (node)
        if (tree.isReport (prev)) {
            return;
        }

        var move = Ext.getCmp ('btnMoveUp').disable ();
        tree.el.mask ('Please wait', 'x-mask-loading');

        Ext.Ajax.request ({
            params : {id: node.id, jd: prev.id},
            url : urls.decreaseRank,

            success : function (xhr, opts) {
                if (node.parentNode == prev.parentNode.parentNode) {
                    prev.parentNode.insertBefore (node, prev);
                    prev.parentNode.insertBefore (prev, node);
                } else {
                    prev.parentNode.insertBefore (node, prev);
                }

                tree.selectPath (node.getPath ());
                tree.el.unmask ();
                move.enable ();
            },

            failure : function (xhr, opts) {
                tree.el.unmask ();
                move.enable ();
                error_msg (resource.MOVE_FAILED);
            }
        });
    }

    function _prev (node) {
        var prev = node.previousSibling
        if (prev) {
            return _last (prev);
        } else {
            return node.parentNode;
        }
    }

    function _last (node) {
        if (node.lastChild) {
            return _last (node.lastChild);
        } else {
            return node;
        }
    }

    // #########################################################################
    // #########################################################################

    function _moveSelectedNodeDown () {

        var tree = Ext.getCmp ('reportManager.tree.id');
        var model = tree.getSelectionModel ();
        var node = model.getSelectedNode ();

        if (node == undefined) {
            return;
        }

        if (tree.isReport (node.nextSibling)) {
            return;
        }

        var next = _next (node)
        if (tree.isReport (next)) {
            return;
        }

        var move = Ext.getCmp ('btnMoveDown').disable ();
        tree.el.mask ('Please wait', 'x-mask-loading');

        Ext.Ajax.request ({
            params : {id: node.id, jd: next.id },
            url : urls.increaseRank,

            success : function (xhr, opts) {
                if (next.parentNode == node.parentNode) {
                    next.parentNode.insertBefore (next, node);
                } else {
                    next.parentNode.insertBefore (node, next);
                }

                tree.selectPath (node.getPath ());
                tree.el.unmask ();
                move.enable ();
            },

            failure : function (xhr, opts) {
                tree.el.unmask ()
                move.enable ()
                error_msg (resource.MOVE_FAILED);
            }
        });
    }

    function _next (node) {
        var next = node.nextSibling;
        if (next) {
            return _first (next);
        } else {
            return node.parentNode.nextSibling;
        }
    }

    function _first (node) {
        if (node.firstChild) {
            return node.firstChild;
        } else {
            return node;
        }
    }

    // #########################################################################
    // #########################################################################

    var result = new Ext.Panel ({
        title : 'NoTex - Report Manager',
        id : 'reportManager.id',
        layout : 'fit',

        tools : [{
            id : 'refresh',
            qtip : '<b>Refresh</b><br/>Refresh report manager\'s view',

            handler : function (event, toolEl, panel) {
                var tree = Ext.getCmp ('reportManager.tree.id');
                var model = tree.getSelectionModel ();
                var node = model.getSelectedNode ();
                var loader = tree.getLoader ();

                if (node) {
                    function _expandRoot (root) { root.expand (); }
                    loader.load (node.parentNode, _expandRoot, this);
                } else {
                    loader.load (tree.root, null, this);
                }
            }
        }],

        tbar : tbar,
        items : [reportManager.tree],

        listeners : {
            importReport : _importReport,
            exportReport : _exportReport,
            exportText : _exportText,
            exportLatex : _exportLatex,
            exportPdf : _exportPdf,
            exportHtml : _exportHtml,
            openFile : _openFile,
            saveTab : _saveTab,
            addReport : _addReport,
            addFolder : _addFolder,
            addTextFile : _addTextFile,
            renameSelectedNode : _renameSelectedNode,
            deleteSelectedNode : _deleteSelectedNode,
            moveSelectedNodeUp : _moveSelectedNodeUp,
            moveSelectedNodeDown : _moveSelectedNodeDown
        }
    });

    for (var key in reportManager) {
        result[key] = reportManager[key];
    }

    return result;
}();

// #############################################################################
// #############################################################################
