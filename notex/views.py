__author__ = "hsk81"
__date__ = "$Mar 27, 2012 1:12:57 PM$"

################################################################################
################################################################################

from django.shortcuts import redirect

################################################################################
################################################################################

def page_not_found (request):

    return redirect ('/editor/')

################################################################################
################################################################################
