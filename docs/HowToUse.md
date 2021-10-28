### deploy network
exec: ./minifab up -l <node|go|java> -e <true|false>  -s couchdb 

### tear down network
exec: ./minifab down

### cleanup
exec: ./minifab cleanup

### discover
exec: ./minifab discover

### deploy explorer
exec: ./minifab exporerup
account: exploreradmin/exploreradminpw

### deploy portainer
exec: ./minifab portainerup

### deploy chaincode:
copy chaincode into /var/chaincode
exec: ./minifab -n <ccname> -l <node|go|java> -d <true|false>
