{% load staticfiles %}Ext.BLANK_IMAGE_URL = "{% static "lib/extjs/resources/images/default/s.gif" %}";reportManager.csrftoken = "{% csrf_token %}";Ext.onReady(function () { Ext.QuickTips.init(); viewport.show();});