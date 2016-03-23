# -*- mode: ruby -*-
# vi: set ft=ruby :

VERSION = 2 # DO NOT CHANGE THIS UNLESS YOU KNOW WHAT YOU ARE DOING.
Vagrant.configure(VERSION) do |config|
  config.vm.box = 'https://oss-binaries.phusionpassenger.com/vagrant/boxes/latest/ubuntu-14.04-amd64-vbox.box'

  config.vm.network 'forwarded_port', guest: 389, host: 1389

  config.vm.network 'private_network', ip: '192.168.33.10'

  config.vm.network 'public_network'

  config.vm.synced_folder 'build', '/vagrant_files'

  config.vm.provider 'virtualbox' do |vb|
    vb.memory = '2048'
  end
  config.vm.provision 'puppet' do |puppet|
    puppet.working_directory = '/tmp/vagrant-puppet'
    puppet.manifest_file = 'default.pp'
  end
end
