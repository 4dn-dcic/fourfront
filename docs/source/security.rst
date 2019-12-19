.. role:: raw-html-m2r(raw)
   :format: html


Security
========

 In pyramids security is interwoven into the framework in a very fined grained fashion.  Each view can have it's own security rules as can each object.  Some basic ideas that are helpful in understanding how security works in the system are listed below.

ACL
---

Access Control Lists are list of three-tuples that specify security rights.The three-tuples takes the form:

.. code-block::

   (grant_type, group, permissions)

   ex:
    (Allow, 'group.admin', ['view', 'edit'])

These ACL's can be attached to a resource by setting the member **acl** as is done in ``encoded.types.base.Item`` and ``encoded.types.base.Collection``.  The system by Default sets up several ACL's:

Item based ACL's
^^^^^^^^^^^^^^^^


* ONLY_ADMIN_VIEW
* ALLOW_EVERYONE_VIEW
* ALLOW_VIEWING_GROUP_VIEW -- based on data in ``award.viewing_group``
* ALLOW_LAB_SUBMITTER_EDIT -- based on users Lab association
* ALLOW_CURRENT_AND_SBMITTER_EDIT -- everyone can view, lab submitter can edit
* ALLOW_CURRENT -- same as ``ALLOW_EVERYONE_VIEW``
* DELETED -- used to now show deleted objects (even though they may still be in database)

COLLECTION based ACL's
^^^^^^^^^^^^^^^^^^^^^^


* ALLOW_SUBMITTER_ADD

Roles
-----

There are several roles defined in the ACL's in ``types\base.py``\ , and more can be created elsewhere in the system.  Common roles are:


* group.admin -- all powerful
* group.read-only-admin -- can see everything
* remoteuser.INDEXER -- used by Elastic Search to access all objects
* remoteuser.EMBED -- used by Embed functionality to travers relationships and embed children into parent
* role-viewing_group_member -- used with ``ALLOW_VIEWING_GROUP_VIEW`` to provide view information.
* role.lab_submitter -- lab association for user to allow view / editing to appropriate data.

Permissions
-----------

Basic permissions include:


* view
* edit
* visible_for_edit -- i.e. a deleted object is not visible for edit
* ['add'] -- can add to a collection

Default Item permissions
------------------------

By default unless specified elsewhere all ``Items`` get a default ACL of:

.. code-block::

   ALLOW_LAB_SUBMITTER_EDIT

This is automatically overwritten if the ``Item`` has a ``status`` defined in ``STATUS_ACL`` (types\base.py(110)).  For example an item with status ``released`` will automatically get the ``ALLOW_CURRENT`` ACL.

This can potentially be overwritten in a particular types.py file by overwriting the ``__acl__``.

_ac_local_roles__
^^^^^^^^^^^^^^^^^

Just before the ACL checks an item can be assigned special roles (during traversal, i.e. during a call to the web server) based on what is defined in ``_ac_local_roles__ (which by default will add``\ submits_for.\ :raw-html-m2r:`<labname>`\ ``and``\ viewing_group.<award.viewing_group>`.

User Roles
----------

And one step earlier, i.e. before _ac_local_roles are set (which are set based on the item) a user is assigned groups based upon information stored in the user profile (see ``schema\user.json``\ ).  Groups are looked up and added to the request in the ``authorization.groupfinder``.

Process overview
----------------


#. 
   Request is made to the system

#. 
   ``authorization.groupfinder`` is called after user is authenticated and request is assigned the principles of user.id (or special principles for remote user / embed user / etc..).  It addition prinicples are assigned for:


* ``<lab>``
* ``submits_for.<lab>``
* ``group.submitter`` -- possibly
* ``groups.<group>``  -- from user.groups
* ``view_group.<group>`` -- from user.viewing_groups


#. 
   Traversal happens (i.e. url is matched to view), also the custom ``ac_local_roles`` kicks in and adds additional principles to the request  as described above.

#. 
   Certain view functions may have an ``@view_config`` that adds additional security checks to see if the request can be processed (default is to use the process described in this document). These are generally declared in the types directory. i.e. ``types.user`` or ``types.page`` are good examples.

#. 
   The request.principles are checked against the view items ACL generated from the item and its status.  If the principles match and the permissions are correct the call proceeds.

Additional info
---------------

Also see ``docs/auth.rst`` for further information on how security works.
