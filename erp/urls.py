__author__ = "hsk81"
__date__ = "$Oct 03, 2012 5:51:15 PM$"

################################################################################
################################################################################

from django.conf.urls import url, patterns
import views

################################################################################
################################################################################

urlpatterns = patterns ('',
    url (r'^btc-transact/$', views.btc_transact, name='btc-transact'),
    url (r'^tco-notify/$', views.tco_notify, name='two-notify'),

    url (r'^checkout/card-0.html', views.checkout_card0, name='card-0'),
    url (r'^checkout/card-1.html', views.checkout_card1, name='card-1'),
)

################################################################################
################################################################################
