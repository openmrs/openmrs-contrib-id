# -*- mode: ruby -*-
# vi: set ft=ruby :

VERSION = 2 # DO NOT CHANGE THIS UNLESS YOU KNOW WHAT YOU ARE DOING.
Vagrant.configure(VERSION) do |config|
  config.vm.box = 'puppetlabs/ubuntu-16.04-64-puppet'
  config.vm.hostname = 'openmrs-id-ldap'
  config.vm.network 'forwarded_port', guest: 389, host: 1389

  config.vm.network 'private_network', ip: '192.168.33.10'

  config.vm.synced_folder 'build', '/vagrant_files'

  config.vm.provider 'virtualbox' do |vb|
    vb.memory = '2048'
  end

  config.vm.provision :puppet do |puppet|
    puppet.environment = 'puppet'
    puppet.environment_path = './'
    puppet.manifests_path   = 'puppet/manifests'
    puppet.working_directory = '/tmp/vagrant-puppet'
    puppet.manifest_file = 'default.pp'
  end
end
