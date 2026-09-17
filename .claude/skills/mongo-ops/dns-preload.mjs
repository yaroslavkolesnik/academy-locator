// Local-only workaround: Node on this machine resolves DNS via 127.0.0.1, which refuses SRV queries
// needed by mongodb+srv:// URIs. Preload with --import; never import it from project code.
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
