/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

// ====CHAINCODE EXECUTION SAMPLES (CLI) ==================

// ==== Invoke assets ====
// peer chaincode invoke -C CHANNEL_NAME -n asset_transfer -c '{"Args":["CreateAsset","asset1","blue","35","Tom","100"]}'
// peer chaincode invoke -C CHANNEL_NAME -n asset_transfer -c '{"Args":["CreateAsset","asset2","red","50","Tom","150"]}'
// peer chaincode invoke -C CHANNEL_NAME -n asset_transfer -c '{"Args":["CreateAsset","asset3","blue","70","Tom","200"]}'
// peer chaincode invoke -C CHANNEL_NAME -n asset_transfer -c '{"Args":["TransferAsset","asset2","jerry"]}'
// peer chaincode invoke -C CHANNEL_NAME -n asset_transfer -c '{"Args":["TransferAssetsBasedOnColor","blue","jerry"]}'
// peer chaincode invoke -C CHANNEL_NAME -n asset_transfer -c '{"Args":["DeleteAsset","asset1"]}'

// ==== Query assets ====
// peer chaincode query -C CHANNEL_NAME -n asset_transfer -c '{"Args":["ReadAsset","asset1"]}'
// peer chaincode query -C CHANNEL_NAME -n asset_transfer -c '{"Args":["GetAssetsByRange","asset1","asset3"]}'
// peer chaincode query -C CHANNEL_NAME -n asset_transfer -c '{"Args":["GetAssetHistory","asset1"]}'

// Rich Query (Only supported if CouchDB is used as state database):
// peer chaincode query -C CHANNEL_NAME -n asset_transfer -c '{"Args":["QueryAssetsByOwner","Tom"]}' output issue
// peer chaincode query -C CHANNEL_NAME -n asset_transfer -c '{"Args":["QueryAssets","{\"selector\":{\"owner\":\"Tom\"}}"]}'

// Rich Query with Pagination (Only supported if CouchDB is used as state database):
// peer chaincode query -C CHANNEL_NAME -n asset_transfer -c '{"Args":["QueryAssetsWithPagination","{\"selector\":{\"owner\":\"Tom\"}}","3",""]}'

// INDEXES TO SUPPORT COUCHDB RICH QUERIES
//
// Indexes in CouchDB are required in order to make JSON queries efficient and are required for
// any JSON query with a sort. Indexes may be packaged alongside
// chaincode in a META-INF/statedb/couchdb/indexes directory. Each index must be defined in its own
// text file with extension *.json with the index definition formatted in JSON following the
// CouchDB index JSON syntax as documented at:
// http://docs.couchdb.org/en/2.3.1/api/database/find.html#db-index
//
// This asset transfer ledger example chaincode demonstrates a packaged
// index which you can find in META-INF/statedb/couchdb/indexes/indexOwner.json.
//
// If you have access to the your peer's CouchDB state database in a development environment,
// you may want to iteratively test various indexes in support of your chaincode queries.  You
// can use the CouchDB Fauxton interface or a command line curl utility to create and update
// indexes. Then once you finalize an index, include the index definition alongside your
// chaincode in the META-INF/statedb/couchdb/indexes directory, for packaging and deployment
// to managed environments.
//
// In the examples below you can find index definitions that support asset transfer ledger
// chaincode queries, along with the syntax that you can use in development environments
// to create the indexes in the CouchDB Fauxton interface or a curl command line utility.
//

// Index for docType, owner.
//
// Example curl command line to define index in the CouchDB channel_chaincode database
// curl -i -X POST -H "Content-Type: application/json" -d "{\"index\":{\"fields\":[\"docType\",\"owner\"]},\"name\":\"indexOwner\",\"ddoc\":\"indexOwnerDoc\",\"type\":\"json\"}" http://hostname:port/myc1_assets/_index
//

// Index for docType, owner, size (descending order).
//
// Example curl command line to define index in the CouchDB channel_chaincode database
// curl -i -X POST -H "Content-Type: application/json" -d "{\"index\":{\"fields\":[{\"size\":\"desc\"},{\"docType\":\"desc\"},{\"owner\":\"desc\"}]},\"ddoc\":\"indexSizeSortDoc\", \"name\":\"indexSizeSortDesc\",\"type\":\"json\"}" http://hostname:port/myc1_assets/_index

// Rich Query with index design doc and index name specified (Only supported if CouchDB is used as state database):
//   peer chaincode query -C CHANNEL_NAME -n asset_transfer -c '{"Args":["QueryAssets","{\"selector\":{\"docType\":\"asset\",\"owner\":\"Tom\"}, \"use_index\":[\"_design/indexOwnerDoc\", \"indexOwner\"]}"]}'

// Rich Query with index design doc specified only (Only supported if CouchDB is used as state database):
//   peer chaincode query -C CHANNEL_NAME -n asset_transfer -c '{"Args":["QueryAssets","{\"selector\":{\"docType\":{\"$eq\":\"asset\"},\"owner\":{\"$eq\":\"Tom\"},\"size\":{\"$gt\":0}},\"fields\":[\"docType\",\"owner\",\"size\"],\"sort\":[{\"size\":\"desc\"}],\"use_index\":\"_design/indexSizeSortDoc\"}"]}'


const { Contract } = require('fabric-contract-api');
const { Buffer } = require('buffer');

class Chaincode extends Contract {

	// CreateAsset - create a new asset, store into chaincode state
	async CreateVoucher(ctx, key, citizen_id, supplier_id, dealer_id, type, status, value, package_id, created_at, updated_at, validDate) {
		const exists = await this.VoucherExists(ctx, key);
		if (exists) {
			throw new Error(`The voucher ${key} already exists`);
		}

		// ==== Create asset object and marshal to JSON ====
		let voucher = {
			docType: 'voucher',
			voucher_id: key,
			citizen_id: citizen_id,
			supplier_id: supplier_id,
			dealer_id: dealer_id,
			status: status,
			value: value,
			type: type,
			package_id: package_id,
			created_at: created_at,
			updated_at: updated_at,
			valid_date: validDate,
		};


		// === Save asset to state ===
		await ctx.stub.putState(key, Buffer.from(JSON.stringify(voucher)));
		let indexName = 'voucher_id~citizen_id';
		let voucherCitizenIndexKey = await ctx.stub.createCompositeKey(indexName, [voucher.voucher_id, voucher.citizen_id]);

		//  Save index entry to state. Only the key name is needed, no need to store a duplicate copy of the marble.
		//  Note - passing a 'nil' value will effectively delete the key from state, therefore we pass null character as value
		await ctx.stub.putState(voucherCitizenIndexKey, Buffer.from('\u0000'));
	}

	// ReadAsset returns the asset stored in the world state with given id.
	async ReadVoucher(ctx, id) {
		const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
		if (!assetJSON || assetJSON.length === 0) {
			throw new Error(`Voucher ${id} does not exist`);
		}

		return assetJSON.toString();
	}

	// delete - remove a asset key/value pair from state
	async DeleteVoucher(ctx, id) {
		if (!id) {
			throw new Error('Voucher id must not be empty');
		}

		let exists = await this.VoucherExists(ctx, id);
		if (!exists) {
			throw new Error(`Voucher ${id} does not exist`);
		}

		// to maintain the color~name index, we need to read the asset first and get its color
		let valAsbytes = await ctx.stub.getState(id); // get the asset from chaincode state
		let jsonResp = {};
		if (!valAsbytes) {
			jsonResp.error = `Voucher does not exist: ${id}`;
			throw new Error(jsonResp);
		}
		let assetJSON;
		try {
			assetJSON = JSON.parse(valAsbytes.toString());
		} catch (err) {
			jsonResp = {};
			jsonResp.error = `Failed to decode JSON of: ${id}`;
			throw new Error(jsonResp);
		}
		await ctx.stub.deleteState(id); //remove the asset from chaincode state

		// delete the index
		let indexName = 'voucher_id~citizen_id';
		let colorNameIndexKey = ctx.stub.createCompositeKey(indexName, [assetJSON.voucher_id, assetJSON.citizen_id]);
		if (!colorNameIndexKey) {
			throw new Error(' Failed to create the createCompositeKey');
		}
		//  Delete index entry to state.
		await ctx.stub.deleteState(colorNameIndexKey);
	}

	// TransferAsset transfers a asset by setting a new owner name on the asset
	async CommitVoucher(ctx, id, newStatus, dealer_id, package_id) {

		let assetAsBytes = await ctx.stub.getState(id);
		if (!assetAsBytes || !assetAsBytes.toString()) {
			throw new Error(`Voucher ${id} does not exist`);
		}
		let currentVoucher = {};
		try {
			currentVoucher = JSON.parse(assetAsBytes.toString()); //unmarshal
		} catch (err) {
			let jsonResp = {};
			jsonResp.error = 'Failed to decode JSON of: ' + id;
			throw new Error(jsonResp);
		}


		currentVoucher.status = newStatus; //change the owner
		currentVoucher.dealer_id = dealer_id; //change the dealer
		currentVoucher.package_id = package_id; //change the package
		currentVoucher.updated_at = new Date().toString(); // change update time


		let assetJSONasBytes = Buffer.from(JSON.stringify(currentVoucher));
		await ctx.stub.putState(id, assetJSONasBytes); //rewrite the asset
	}

	// GetAssetsByRange performs a range query based on the start and end keys provided.
	// Read-only function results are not typically submitted to ordering. If the read-only
	// results are submitted to ordering, or if the query is used in an update transaction
	// and submitted to ordering, then the committing peers will re-execute to guarantee that
	// result sets are stable between endorsement time and commit time. The transaction is
	// invalidated by the committing peers if the result set has changed between endorsement
	// time and commit time.
	// Therefore, range queries are a safe option for performing update transactions based on query results.
	async GetVouchersByRange(ctx, startKey, endKey) {

		let resultsIterator = await ctx.stub.getStateByRange(startKey, endKey);
		let results = await this._GetAllResults(resultsIterator, false);

		return JSON.stringify(results);
	}

	// TransferAssetBasedOnColor will transfer assets of a given color to a certain new owner.
	// Uses a GetStateByPartialCompositeKey (range query) against color~name 'index'.
	// Committing peers will re-execute range queries to guarantee that result sets are stable
	// between endorsement time and commit time. The transaction is invalidated by the
	// committing peers if the result set has changed between endorsement time and commit time.
	// Therefore, range queries are a safe option for performing update transactions based on query results.
	// Example: GetStateByPartialCompositeKey/RangeQuery
	// async TransferAssetByColor(ctx, color, newOwner) {
	// 	// Query the color~name index by color
	// 	// This will execute a key range query on all keys starting with 'color'
	// 	let coloredAssetResultsIterator = await ctx.stub.getStateByPartialCompositeKey('color~name', [color]);

	// 	// Iterate through result set and for each asset found, transfer to newOwner
	// 	let responseRange = await coloredAssetResultsIterator.next();
	// 	while (!responseRange.done) {
	// 		if (!responseRange || !responseRange.value || !responseRange.value.key) {
	// 			return;
	// 		}

	// 		let objectType;
	// 		let attributes;
	// 		(
	// 			{ objectType, attributes } = await ctx.stub.splitCompositeKey(responseRange.value.key)
	// 		);

	// 		console.log(objectType);
	// 		let returnedAssetName = attributes[1];

	// 		// Now call the transfer function for the found asset.
	// 		// Re-use the same function that is used to transfer individual assets
	// 		await this.TransferAsset(ctx, returnedAssetName, newOwner);
	// 		responseRange = await coloredAssetResultsIterator.next();
	// 	}
	// }

	// QueryAssetsByOwner queries for assets based on a passed in owner.
	// This is an example of a parameterized query where the query logic is baked into the chaincode,
	// and accepting a single query parameter (owner).
	// Only available on state databases that support rich query (e.g. CouchDB)
	// Example: Parameterized rich query
	async QueryAssetsByCitizen(ctx, citizen_id) {
		let queryString = {};
		queryString.selector = {};
		queryString.selector.docType = 'voucher';
		queryString.selector.citizen_id = citizen_id;
		return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); //shim.success(queryResults);
	}

	// Example: Ad hoc rich query
	// QueryAssets uses a query string to perform a query for assets.
	// Query string matching state database syntax is passed in and executed as is.
	// Supports ad hoc queries that can be defined at runtime by the client.
	// If this is not desired, follow the QueryAssetsForOwner example for parameterized queries.
	// Only available on state databases that support rich query (e.g. CouchDB)
	async QueryVoucher(ctx, queryString) {
		return await this.GetQueryResultForQueryString(ctx, queryString);
	}

	// GetQueryResultForQueryString executes the passed in query string.
	// Result set is built and returned as a byte array containing the JSON results.
	async GetQueryResultForQueryString(ctx, queryString) {

		let resultsIterator = await ctx.stub.getQueryResult(queryString);
		let results = await this._GetAllResults(resultsIterator, false);

		return JSON.stringify(results);
	}

	// Example: Pagination with Range Query
	// GetAssetsByRangeWithPagination performs a range query based on the start & end key,
	// page size and a bookmark.
	// The number of fetched records will be equal to or lesser than the page size.
	// Paginated range queries are only valid for read only transactions.
	async GetVouchersByRangeWithPagination(ctx, startKey, endKey, pageSize, bookmark) {

		const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination(startKey, endKey, pageSize, bookmark);
		const results = await this._GetAllResults(iterator, false);

		results.ResponseMetadata = {
			RecordsCount: metadata.fetched_records_count,
			Bookmark: metadata.bookmark,
		};
		return JSON.stringify(results);
	}

	// Example: Pagination with Ad hoc Rich Query
	// QueryAssetsWithPagination uses a query string, page size and a bookmark to perform a query
	// for assets. Query string matching state database syntax is passed in and executed as is.
	// The number of fetched records would be equal to or lesser than the specified page size.
	// Supports ad hoc queries that can be defined at runtime by the client.
	// If this is not desired, follow the QueryAssetsForOwner example for parameterized queries.
	// Only available on state databases that support rich query (e.g. CouchDB)
	// Paginated queries are only valid for read only transactions.
	async QueryVouchersWithPagination(ctx, queryString, pageSize, bookmark) {

		const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
		const results = await this._GetAllResults(iterator, false);

		results.ResponseMetadata = {
			RecordsCount: metadata.fetched_records_count,
			Bookmark: metadata.bookmark,
		};

		return JSON.stringify(results);
	}

	// GetAssetHistory returns the chain of custody for an asset since issuance.
	async GetVoucherHistory(ctx, voucher_id) {

		let resultsIterator = await ctx.stub.getHistoryForKey(voucher_id);
		let results = await this._GetAllResults(resultsIterator, true);

		return JSON.stringify(results);
	}

	// AssetExists returns true when asset with given ID exists in world state
	async VoucherExists(ctx, voucher_id) {
		// ==== Check if asset already exists ====
		let assetState = await ctx.stub.getState(voucher_id);
		return assetState && assetState.length > 0;
	}

	// This is JavaScript so without Funcation Decorators, all functions are assumed
	// to be transaction functions
	//
	// For internal functions... prefix them with _
	async _GetAllResults(iterator, isHistory) {
		let allResults = [];
		let res = await iterator.next();
		while (!res.done) {
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) {
					jsonRes.TxId = res.value.txId;
					jsonRes.Timestamp = res.value.timestamp;
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else {
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Record = res.value.value.toString('utf8');
					}
				}
				allResults.push(jsonRes);
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
	}

	// InitLedger creates sample assets in the ledger
	async InitLedger(ctx) {
		const assets = [
			{ id: "133", citizen_id: "123", supplier_id: "123", dealer_id: "123", status: "UNUSE", value: "123", package_id: "123", created_at: new Date().toString(), updated_at: new Date().toString() }
		];

		for (const asset of assets) {
			await this.CreateVoucher(
				ctx,
				asset.id,
				asset.citizen_id,
				asset.supplier_id,
				asset.dealer_id,
				asset.status,
				asset.value,
				asset.package_id,
				asset.created_at,
				asset.updated_at
			);
		}
	}
}

module.exports = Chaincode;
