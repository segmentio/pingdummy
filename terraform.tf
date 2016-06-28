module "stack" {
  source      = "github.com/segmentio/stack"
  name        = "pingdummy"
  environment = "prod"
  key_name    = "bastion-ssh"
}

module "domain" {
  source = "github.com/segmentio/stack//dns"
  name   = "pingdummy.com"
}

module "pingdummy" {
  source             = "github.com/segmentio/stack//web-service"
  image              = "segment/pingdummy"
  port               = 3000
  ssl_certificate_id = "arn:aws:acm:us-west-2:458175278816:certificate/a5c477da-8ba1-4310-b081-eae6824b038a"

  environment      = "${module.stack.environment}"
  cluster          = "${module.stack.cluster}"
  iam_role         = "${module.stack.iam_role}"
  security_groups  = "${module.stack.external_elb}"
  subnet_ids       = "${module.stack.external_subnets}"
  log_bucket       = "${module.stack.log_bucket_id}"
  internal_zone_id = "${module.stack.zone_id}"
  external_zone_id = "${module.domain.zone_id}"

  env_vars = <<EOF
[
  { "name": "AWS_REGION",            "value": "${module.stack.region}"        },
  { "name": "AWS_ACCESS_KEY_ID",     "value": "${module.ses_user.access_key}" },
  { "name": "AWS_SECRET_ACCESS_KEY", "value": "${module.ses_user.secret_key}" }
]
EOF
}

module "worker" {
  source      = "github.com/segmentio/stack//worker"
  environment = "${module.stack.environment}"
  name        = "worker"
  image       = "segment/pingdummy-worker"
  cluster     = "default"
  cpu         = 256
  memory      = 256
}

resource "aws_route53_record" "root" {
  zone_id = "${module.domain.zone_id}"
  name    = "${module.domain.name}"
  type    = "A"

  alias {
    name                   = "${module.pingdummy.dns}"
    zone_id                = "${module.pingdummy.zone_id}"
    evaluate_target_health = false
  }
}

module "db" {
  source             = "../stack/rds-cluster"
  name               = "pingdummy"
  database_name      = "pingdummy"
  master_username    = "root"
  master_password    = "password"
  environment        = "${module.stack.environment}"
  vpc_id             = "${module.stack.vpc_id}"
  zone_id            = "${module.stack.zone_id}"
  security_groups    = "${module.stack.ecs_cluster_security_group_id}"
  subnet_ids         = "${module.stack.internal_subnets}"
  availability_zones = "${module.stack.availability_zones}"
}

module "beacon" {
  source         = "github.com/segmentio/stack//service"
  name           = "beacon"
  image          = "segment/pingdummy-beacon"
  port           = 3001
  container_port = 3001
  dns_name       = "beacon"

  environment     = "${module.stack.environment}"
  cluster         = "${module.stack.cluster}"
  zone_id         = "${module.stack.zone_id}"
  iam_role        = "${module.stack.iam_role}"
  security_groups = "${module.stack.internal_elb}"
  subnet_ids      = "${module.stack.internal_subnets}"
  log_bucket      = "${module.stack.log_bucket_id}"
}

module "ses_user" {
  source = "github.com/segmentio/stack//iam-user"
  name   = "ses-user"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:*"],
      "Resource":"*"
    }
  ]
}
EOF
}

resource "aws_route53_record" "main" {
  zone_id = "${module.domain.zone_id}"
  name    = "${module.domain.name}"
  type    = "A"

  alias {
    name                   = "${module.pingdummy.dns}"
    zone_id                = "${module.pingdummy.zone_id}"
    evaluate_target_health = false
  }
}

output "bastion_ip" {
  value = "${module.stack.bastion_ip}"
}
