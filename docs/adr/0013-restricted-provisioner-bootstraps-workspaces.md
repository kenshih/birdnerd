# A restricted provisioner bootstraps the first workspace and Admin

The first end-to-end event slice will create a Workspace and its initial Admin
Membership through a restricted Provisioner rather than the Field PWA. The
Provisioner emits the same canonical events and uses the ordinary admission
and projection path, so bootstrap authority does not require privileged direct
projection or database writes.
