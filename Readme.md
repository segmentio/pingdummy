
# pingdummy

A dummy healthcheck app deployed via the Segment [Stack][stack].

[stack]: https://github.com/segmentio/stack

## Bootstrap the app

First you can set up the initial DB tables correctly by using:

    # node db/setup.js

Next you will need to set up an SES identity so the app can send out emails:

    # node ops/setup.js

## Terraform setup

If you don't have ssh keys in AWS, you can create them using:

    $ make keys

Next you'll want to set up an S3 bucket as a way to manage the terraform state remotely.

    $ make bucket BUCKET=<bucket-name>

Anyone who is making changes to terraform will then want to configure terraform to pull from the remote state.

    $ make remote BUCKET=<bucket-name>

After that, terraform is configured and ready to run against the remote state. Assuming you have your AWS credentials exported, you can simply run

    $ make plan    # see changes
    $ make apply   # apply the changes

If you created keys using `make keys`, you will want to copy them to bastion
in order to be able to ssh to other machines, First grab the bastion host public ip using `terraform output`:

    bastion_ip = x.x.x.x

Next copy the keys to the bastion:

    $ make copy-key IP=x.x.x.x
