import pg from 'pg'

const { Pool } = pg

class Database {
	//@ts-expect-error typeidiot
	private static instance: Pool

	private constructor() {}

	public static getInstance(): pg.Pool {
		if (!Database.instance) {
			Database.instance = new Pool({
				user: 'streamingdb',
				host: 'POSTGRES',
				database: 'streamingdb',
				password: 'dbstreaming',
				port: 5432,
			})
		}
		return Database.instance
	}
}

export default Database.getInstance()
