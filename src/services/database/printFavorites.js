import { dbVars } from './index.js';
import sqliteService from '../sqlite.js';

const printFavorites = {
    addPrintToFavorites(printId) {
        return sqliteService.executeNonQuery(
            `INSERT OR IGNORE INTO ${dbVars.userPrefix}_favorite_print (print_id, created_at) VALUES (@print_id, @created_at)`,
            { '@print_id': printId, '@created_at': new Date().toJSON() }
        );
    },

    removePrintFromFavorites(printId) {
        return sqliteService.executeNonQuery(
            `DELETE FROM ${dbVars.userPrefix}_favorite_print WHERE print_id = @print_id`,
            { '@print_id': printId }
        );
    },

    async getPrintFavorites() {
        const favorites = [];
        await sqliteService.execute(
            (row) => favorites.push({ printId: row[0] }),
            `SELECT print_id FROM ${dbVars.userPrefix}_favorite_print`
        );
        return favorites;
    }
};

export { printFavorites };
