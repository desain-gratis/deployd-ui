deploy:
	tar -czvf out.tar.gz out/
	scp out.tar.gz root@mb1:/var
	ssh root@mb1 cd /var/;tar -xzvf out.tar.gz; sudo rm -rf /var/www/*; 
	ssh root@mb1 sudo cp -r /var/out/* /var/www
