import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

Gio._promisify(Gio.File.prototype, 'load_contents_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_bytes_async', 'replace_contents_finish');

export default class TransMyGnome extends Extension {
  gtk4ConfigDirectory = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-4.0']));
  userGtkStylesheetFile = this.gtk4ConfigDirectory.get_child('gtk.css');
  transMyGnomeStylesheetFile = this.dir.get_child('stylesheets').get_child('trans-my-gnome.css');

  async enable() {
    try {
      this.setupGtkFolder()

      const oldUserGtkStylesheet = await this.readFileContents(this.userGtkStylesheetFile).catch(this.throwWithMessage("Could not get gtk.css contents."))
      const newUserGtkStylesheet = this.addTransMyGnomeImport(oldUserGtkStylesheet)
      await this.replaceFileContents(this.userGtkStylesheetFile,newUserGtkStylesheet)
    }
    catch (e) {
      console.error(e)
    }
  }

  async disable() {
    try {
      const oldUserGtkStylesheet = await this.readFileContents(this.userGtkStylesheetFile).catch("Could not get gtk.css contens.")
      const newUserGtkStylesheet = this.removeTransMyGnomeImport(oldUserGtkStylesheet)
      await this.replaceFileContents(this.userGtkStylesheetFile,newUserGtkStylesheet)
    }
    catch (e) {
      console.error(e)
    }
  }

  throwWithMessage(m) {
    return (e)=>{
      const msg = `[trans-my-gnome@emmeken.net] "${m}" : ${e}`
      throw new Error(msg)
    }
  }


  async readFileContents(file) {
    let string = ''
    if (file.query_exists(null)) {
      const [contents] = await file.load_contents_async(null).catch(this.throwWithMessage(`Could not open file for reading ${file.get_path()}`))
      string = new TextDecoder().decode(contents);
    }
    return string
  }

  async replaceFileContents(file,contents) {
    try {
      await file.replace_contents_bytes_async(new GLib.Bytes(contents), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null)

    } catch (e) {
      this.throwWithMessage(`Failed to replace contents of file '${file.get_path()}'.`)(e)
    }
  }

  setupGtkFolder() {
    if (!this.gtk4ConfigDirectory.query_exists(null)) {
        this.gtk4ConfigDirectory.make_directory_with_parents(null);
    }
  }

  addTransMyGnomeImport(contents) {
    let removedImport = this.removeTransMyGnomeImport(contents)
    removedImport += (removedImport == '') ? '' : '\n'
    const importString = `@import '${this.transMyGnomeStylesheetFile.get_path()}';\n`;
    return removedImport + importString
  }

  removeTransMyGnomeImport(contents) {
    const regex = /\s*@import.*?trans-my-gnome@emmeken\.net.*?;\s*/
    const removedImport = contents.replace(regex,'')
    return removedImport
  }

}
