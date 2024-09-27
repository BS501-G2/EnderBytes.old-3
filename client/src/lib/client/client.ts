import { Buffer } from 'buffer';
import BSON from 'bson';
import Axios from 'axios';

const axios = Axios.create({
	withCredentials: true
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exec(path: string, params: any): Promise<any> {
	const request = BSON.serialize({ Data: params });
	const response = await axios.post(`http://10.1.0.230:8082/${path}`, request, {});

	if (response.status) {
		throw new Error(`HTTP ${response.status} ${response.statusText}`);
	}

	if (response.headers['Content-Type'] !== 'application/bson') {
		throw new Error('Data Error');
	}

	if (response.data.Error != null) {
		throw new Error(`${response.data.Data.Error.Name} ${response.data.Data.Error.Message}`);
	}

	return response.data.Data.Data ?? null;
}
