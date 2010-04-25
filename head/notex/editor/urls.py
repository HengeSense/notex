from django.conf.urls.defaults   import *
from django.views.generic.simple import direct_to_template

from views import VIEW
from views import DATA
from views import POST

urlpatterns = patterns('',

    url(
        r'^$',
        VIEW.main,
        name='view.main'
    ),

    url(
        r'^json/info/$',
        DATA.info,
        name='json.info'
    ),

    url(
        r'^post/node/$',
        POST.node,
        name='post.node'
    ),
    
)

if __name__ == "__main__":

    pass

else:

    from svc.urls import data_urlpatterns
    from models   import *
