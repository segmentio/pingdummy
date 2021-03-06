
DEPS= frontend/node_modules \
	common/node_modules \
	beacon/node_modules \
	db/node_modules

bucket:
	@test "${BUCKET}" || (echo '$$BUCKET name required' && exit 1)
	aws s3 mb s3://$(BUCKET)

remote:
	@test "${BUCKET}" || (echo '$$BUCKET name required' && exit 1)
	@terraform remote config \
    -backend=s3 \
    -backend-config="bucket=$(BUCKET)" \
    -backend-config="key=/terraform"

.terraform:
	terraform get -update=true

plan:
	terraform plan --out plan

apply:
	terraform apply plan

copy-key:
	@test "${IP}" || (echo 'bastion $$IP required' && exit 1)
	@scp -i keys/bastion-ssh \
		keys/bastion-ssh \
		ubuntu@${IP}:/home/ubuntu/.ssh/key.pem

keys:
	mkdir -p keys
	ssh-keygen \
		-C 'Generated by Stack' \
		-f 'keys/bastion-ssh'

docker: $(DEPS)
	@docker build -t frontend .
	@docker build -t beacon ./beacon

${DEPS}:
	@cd `dirname $@` && npm i

clean:
	@rm -rf plan .terraform terraform.tfstate.backup

.PHONY: remote update plan apply .terraform clean
